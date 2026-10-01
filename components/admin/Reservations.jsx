import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApiFetch } from './adminApi';
import Pagination from './Pagination';

const STATUS_OPTIONS = [
  { value: 'pending_payment',  label: 'Under Negotiation' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'shipped',          label: 'Shipped' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'cancelled',        label: 'Cancelled' },
];

const STATUS_COLORS = {
  reserved:         'bg-amber-100 text-amber-700 border-amber-200',
  pending_payment:  'bg-blue-100 text-blue-700 border-blue-200',
  payment_received: 'bg-blue-100 text-blue-700 border-blue-200',
  ordered:          'bg-indigo-100 text-indigo-700 border-indigo-200',
  shipped:          'bg-orange-100 text-orange-700 border-orange-200',
  delivered:        'bg-green-100 text-green-700 border-green-200',
  cancelled:        'bg-red-100 text-red-700 border-red-200',
  expired:          'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS = {
  reserved:         'Reserved',
  pending_payment:  'Under Negotiation',
  payment_received: 'Payment Received',
  ordered:          'Ordered',
  shipped:          'Shipped',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
  expired:          'Expired',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${STATUS_COLORS[status] || STATUS_COLORS.expired}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const NAVY = '#1e3a8a';
const SKY = '#1da1f2';
const ORANGE = '#f1892b';

// Prefill the invoice generator from a reservation: buyer, car, shipping, and
// the amount still to pay. The generator reads this once from storage.
function issueInvoiceFromReservation(item) {
  const toNum = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const price = toNum(item.price || item.agreed_price);
  const paid = toNum(item.amount_paid);
  const remaining = Math.max(0, price - paid);
  const name = [item.make, item.model, item.year].filter(Boolean).join(' ');
  const inspection = item.inspection_required === null || item.inspection_required === undefined
    ? '' : (Number(item.inspection_required) ? 'Included' : 'Not Included');
  const invoiceData = {
    customer_name:         item.buyer_name || '',
    email:                 item.buyer_email || '',
    customer_phone:        item.buyer_phone || '',
    customer_country:      item.buyer_home_country || '',
    customer_company:      item.buyer_company || '',
    customer_address:      item.buyer_address || '',
    make:                  item.make || '',
    model:                 item.model || '',
    vehicle_ref:           item.ref_no || item.vehicle_ref || '',
    chasis_number:         item.chassis_no || '',
    engine_capacity:       item.engine_capacity || '',
    mileage:               item.mileage || '',
    vehicle_description:   name,
    total_price:           price || '',
    deposit_amount:        remaining || price || '',
    deposit_currency:      item.currency || 'USD',
    deposit_purpose:       'Paying My Vehicle',
    invoice_type:          paid > 0 ? 'commercial' : 'proforma',
    description:           `${paid > 0 ? 'Balance payment' : 'Payment'} for ${name}${item.ref_no ? ` (Ref: ${item.ref_no})` : ''}`,
    destination_country:   item.buyer_country || '',
    destination_port:      item.destination_port || '',
    pre_export_inspection: inspection,
  };
  const payload = JSON.stringify(invoiceData);
  try { sessionStorage.setItem('invoiceData', payload); } catch {}
  try { localStorage.setItem('invoiceData', payload); } catch {}
  window.open('/invoice-generator', '_blank', 'noopener,noreferrer');
}

function ReservationModal({ item, onClose, onUpdate, updatingId, onExtend }) {
  const v = item.vehicle_snapshot || {};
  const vName = v.name || [v.year, v.make, v.model].filter(Boolean).join(' ') || item.ref_no || item.vehicle_ref;
  const [newStatus, setNewStatus] = useState(item.status || 'pending_payment');
  const [amountPaid, setAmountPaid] = useState(String(item.amount_paid || '0'));
  const [notes, setNotes] = useState(item.admin_notes || item.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [extendHours, setExtendHours] = useState('24');
  const [extending, setExtending] = useState(false);
  const [localExpiresAt, setLocalExpiresAt] = useState(item.expires_at);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await adminApiFetch('inventory/cars/saveCars.php', {
      method: 'POST',
      body: { action: 'update_notes', id: item.id, admin_notes: notes },
    });
    setSavingNotes(false);
  };

  const handleExtendClick = async () => {
    const hrs = parseInt(extendHours) || 24;
    if (hrs < 1 || hrs > 168) return;
    setExtending(true);
    const result = await onExtend(item.id, hrs);
    setExtending(false);
    if (result?.success && result.expires_at) {
      setLocalExpiresAt(result.expires_at);
    }
  };

  const remaining = Math.max(0, Number(item.agreed_price || item.price) - Number(amountPaid));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[92vh]">
<div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-5 border-b border-gray-200" style={{ backgroundColor: NAVY }}>
          <div className="min-w-0">
            <h2 className="font-bebas text-xl sm:text-2xl text-white tracking-wide truncate">Reservation</h2>
            <StatusBadge status={item.status || 'pending_payment'} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><i className="fas fa-times text-lg sm:text-xl" /></button>
        </div>
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          <div className="flex gap-2 sm:gap-3 bg-gray-50 rounded-xl p-2 sm:p-3 border border-gray-200">
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-xs sm:text-sm text-primary uppercase truncate">{vName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">Ref: {item.ref_no || item.vehicle_ref}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
            <p className="font-bold text-gray-800">{item.buyer_name || item.customer_name || item.user_full_name}</p>
            <p className="text-xs text-gray-500">{item.buyer_email || item.customer_email || item.user_email}{item.buyer_country || item.country ? ` · ${item.buyer_country || item.country}` : ''}</p>
            {item.buyer_phone && <p className="text-xs text-gray-500">{item.buyer_phone}</p>}
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Pricing</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
              {Number(item.price || item.agreed_price) > 0 && <div className="flex justify-between font-extrabold text-sm"><span className="text-gray-700">Total</span><span className="text-primary">{item.currency || 'USD'} {Number(item.price || item.agreed_price).toLocaleString()}</span></div>}
            </div>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[9px] font-extrabold uppercase text-gray-400 tracking-widest">Agreed</p>
              <p className="font-extrabold text-gray-800 text-sm mt-1">{item.currency || 'USD'} {Number(item.price || item.agreed_price).toLocaleString()}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-[9px] font-extrabold uppercase text-green-500 tracking-widest">Paid</p>
              <input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-full bg-transparent text-center font-extrabold text-green-700 text-sm mt-1 focus:outline-none" />
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[9px] font-extrabold uppercase text-amber-500 tracking-widest">Remaining</p>
              <p className="font-extrabold text-amber-700 text-sm mt-1">{remaining > 0 ? `${remaining.toLocaleString()}` : <span className="text-green-600">Fully Paid</span>}</p>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Update Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="flex gap-2 sm:gap-3 pt-2 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50 transition">Close</button>
            <button onClick={() => issueInvoiceFromReservation(item)} className="flex-1 border border-blue-200 text-blue-700 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-50 transition flex items-center justify-center gap-2" title="Open the invoice generator with this reservation filled in">
              <i className="fas fa-file-invoice" /> Issue invoice
            </button>
<button onClick={() => onUpdate(item.id, newStatus, parseFloat(amountPaid))} disabled={updatingId === item.id} className="flex-1 text-white py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-70" style={{ backgroundColor: NAVY }}>
              {updatingId === item.id ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-check" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Reservations({ showMessage, users: propUsers = [] }) {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchItems = useCallback(async (q) => {
    setLoading(true);
    const result = await adminApiFetch('inventory/cars/fetchReservations.php');
    let list = Array.isArray(result) ? result : [];
    if (q) { const s = q.toLowerCase(); list = list.filter(v => (v.buyer_name||'').toLowerCase().includes(s) || (v.ref_no||'').toLowerCase().includes(s) || (v.make||'').toLowerCase().includes(s) || (v.model||'').toLowerCase().includes(s)); }
    setItems(list);
    setCounts({ pending_payment: list.length });
    setPage(1);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e) => { e.preventDefault(); fetchItems(search); };

  const handleStatusUpdate = async (id, status, amountPaid) => {
    setUpdatingId(id);
    const result = await adminApiFetch('inventory/cars/saveCars.php', {
      method: 'POST',
      body: { action: 'update_status', id, status, amount_paid: amountPaid }
    });
    if (result?.status === 'success' || result?.success) {
      showMessage('Reservation updated', 'success');
      fetchItems(search);
      setDetailItem(null);
    } else {
      showMessage(result?.message || 'Update failed', 'error');
    }
    setUpdatingId(null);
  };

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => {
    const max = Math.max(1, Math.ceil(items.length / itemsPerPage));
    if (page > max) setPage(max);
  }, [items.length, itemsPerPage, page]);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, page, itemsPerPage]);

  const handleExtend = async (id, hours) => {
    const result = await adminApiFetch('inventory/cars/saveCars.php', {
      method: 'POST', body: { action: 'extend_reservation', id, hours }
    });
    if (result?.status === 'success' || result?.success) {
      showMessage(`Reservation extended by ${hours} hours`, 'success');
      fetchItems(search);
    } else {
      showMessage(result?.message || 'Failed to extend', 'error');
    }
    return result;
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: 'Under Negotiation', key: 'pending_payment', color: 'blue' },
          { label: 'Payment Received', key: 'payment_received', color: 'blue' },
          { label: 'Shipped', key: 'shipped', color: 'orange' },
          { label: 'Delivered', key: 'delivered', color: 'green' },
        ].map(({ label, key, color }) => (
          <button key={key} onClick={() => { setStatusFilter(key); }}
            className={`bg-white border-2 rounded-xl p-2 sm:p-4 text-left transition hover:shadow-md ${statusFilter === key ? 'border-primary' : 'border-gray-200'}`}>
            <p className="text-base sm:text-2xl font-extrabold text-gray-800">{counts[key] || 0}</p>
            <p className={`text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest text-${color}-600 mt-0.5 sm:mt-1`}>{label}</p>
          </button>
        ))}
      </div>
<div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-1 sm:gap-2 w-full sm:flex-1 sm:min-w-0">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="flex-1 border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none min-w-0" style={{ borderColor: '#d1d5db' }} />
          <button type="submit" className="text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold hover:opacity-90 transition" style={{ backgroundColor: NAVY }}><i className="fas fa-search sm:hidden" /><span className="hidden sm:inline">Search</span></button>
        </form>
        <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-primary">
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-12 sm:py-16"><i className="fas fa-circle-notch animate-spin text-xl sm:text-2xl text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 sm:py-12 text-gray-400">
          <i className="fas fa-calendar-times text-3xl sm:text-4xl mb-2 sm:mb-3 block" />
          <p className="font-bold text-sm sm:text-base">No reservations found</p>
        </div>
      ) : (
        <>
          <div className="md2:hidden space-y-3">
            {pagedItems.map((r) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 text-sm truncate">{r.buyer_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{r.buyer_email}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 truncate flex-1 min-w-0 mr-2">{r.make} {r.model}</span>
                  <span className="font-extrabold text-gray-900 whitespace-nowrap">{r.currency || 'USD'} {Number(r.price || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-3 text-gray-400">
                    <span>Ref {r.ref_no}</span>
                    {r.expires_at && <span className="text-amber-600"><i className="fas fa-clock mr-0.5" />{new Date(r.expires_at).toLocaleDateString()}</span>}
                  </div>
                  <div className="flex gap-1.5 items-center shrink-0">
                    <button onClick={() => setDetailItem(r)} className="text-primary text-[10px] font-bold px-2.5 py-1 rounded-lg border border-primary/30 hover:bg-primary/5 transition">Manage</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md2:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="py-3 text-left pl-2">Customer</th>
                  <th className="py-3 text-left">Vehicle</th>
                  <th className="py-3 text-left">Total</th>
                  <th className="py-3 text-left">Paid</th>
                  <th className="py-3 text-left">Status</th>
                  <th className="hidden lg:table-cell py-3 text-left">Expires</th>
                  <th className="py-3 text-left whitespace-nowrap w-px">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 pl-2">
                      <p className="font-bold text-gray-800 text-sm">{r.buyer_name || '-'}</p>
                      <p className="text-[10px] text-gray-400">{r.buyer_email}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-bold text-gray-800 text-xs max-w-[200px] truncate">{r.make} {r.model}</p>
                      <p className="text-[10px] text-gray-400">Ref: {r.ref_no}</p>
                    </td>
                    <td className="py-3 font-extrabold text-gray-900 text-xs whitespace-nowrap">{r.currency || 'USD'} {Number(r.price || 0).toLocaleString()}</td>
                    <td className="py-3 text-xs">
                      <p className="font-bold text-green-600">{r.currency || 'USD'} {Number(r.amount_paid || 0).toLocaleString()}</p>
                    </td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                    <td className="hidden lg:table-cell py-3 text-xs text-gray-400">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '-'}</td>
                    <td className="py-3 pr-2 whitespace-nowrap w-px">
                      <button onClick={() => setDetailItem(r)} className="text-primary hover:text-primary/70 text-xs font-bold px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5 transition">Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
      {detailItem && (
        <ReservationModal item={detailItem} onClose={() => setDetailItem(null)} onUpdate={handleStatusUpdate} updatingId={updatingId} onExtend={handleExtend} />
      )}
    </div>
  );
}

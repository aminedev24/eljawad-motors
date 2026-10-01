import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { adminApiFetch } from './adminApi';
import { formatNumberWithUnit } from '../utilities/numberFormat';
import Pagination from './Pagination';
const NAVY = '#1e3a8a';

const STATUSES = ['draft', 'sent', 'paid', 'cancelled'];

const STATUS_STYLES = {
  paid: 'bg-green-50 border-green-200 text-green-700',
  sent: 'bg-blue-50 border-blue-200 text-blue-700',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
  draft: 'bg-gray-50 border-gray-200 text-gray-500',
};

const STATUS_ICONS = {
  paid: 'fa-check-circle',
  sent: 'fa-paper-plane',
  cancelled: 'fa-times-circle',
  draft: 'fa-file',
};

const TYPE_LABELS = { proforma: 'Proforma', deposit: 'Deposit', commercial: 'Commercial' };

// DB stores deposit_amount as a display string like "2,000 USD" or "2000 USD".
// Parse out the numeric part so we never render NaN, and keep the currency.
const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  const match = str.match(/^(-?[\d,.]+)\s*([A-Za-z€£¥$]*)$/);
  if (!match) return str;
  const num = Number(match[1].replace(/,/g, ''));
  if (Number.isNaN(num)) return str;
  const currency = match[2] || '';
  return { num, currency };
};

const currencyOf = (inv) => {
  const parsed = parseAmount(inv.deposit_amount);
  return inv.deposit_currency || (parsed && typeof parsed === 'object' ? parsed.currency : '') || '';
};

const dueNumber = (inv) => {
  const parsed = parseAmount(inv.deposit_amount);
  return parsed && typeof parsed === 'object' ? parsed.num : null;
};

const amountLabel = (inv) => {
  const parsed = parseAmount(inv.deposit_amount);
  if (!parsed) return inv.deposit_currency || '—';
  if (typeof parsed === 'string') return parsed;
  return `${currencyOf(inv)} ${parsed.num.toLocaleString()}`.trim();
};

const totalLabel = (inv) => {
  const total = Number(inv.total_price);
  const due = dueNumber(inv);
  if (!total || due === null || total <= due) return null;
  return `of ${currencyOf(inv)} ${total.toLocaleString()}`.trim();
};

// The invoice form uses "any" as its empty make/model placeholder.
const realPart = (v) => (v && String(v).toLowerCase() !== 'any' ? v : '');

const vehicleLabel = (inv) => {
  const make = realPart(inv.make);
  const model = realPart(inv.model);
  const desc = inv.vehicle_description || '';
  return [make, model].filter(Boolean).join(' ') || desc || '—';
};

const fmtDate = (v) => (v ? new Date(String(v).replace(' ', 'T')).toLocaleDateString() : null);

function StatusBadge({ inv }) {
  const status = inv.status || 'draft';
  return (
    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
      <i className={`fas ${STATUS_ICONS[status] || 'fa-file'}`} />
      {status}
    </span>
  );
}

// Forward-only actions: draft -> sent/paid/cancel, sent -> paid/cancel.
function StatusActions({ inv, onChange, busy }) {
  const status = inv.status || 'draft';
  if (status === 'paid' || status === 'cancelled') return null;
  const btn = 'text-[10px] font-bold uppercase px-2 py-1 rounded border transition disabled:opacity-50';
  return (
    <div className="flex gap-1">
      {status === 'draft' && (
        <button disabled={busy} onClick={() => onChange(inv, 'sent')} className={`${btn} border-blue-200 text-blue-700 hover:bg-blue-50`} title="Mark as sent">Sent</button>
      )}
      <button disabled={busy} onClick={() => onChange(inv, 'paid')} className={`${btn} border-green-200 text-green-700 hover:bg-green-50`} title="Mark as paid">Paid</button>
      <button disabled={busy} onClick={() => onChange(inv, 'cancelled')} className={`${btn} border-red-200 text-red-600 hover:bg-red-50`} title="Cancel invoice">Cancel</button>
    </div>
  );
}

const Field = ({ label, children, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">{label}</span>
    <div className="text-gray-800 break-words">{children || '—'}</div>
  </div>
);

const EDIT_FIELDS = [
  ['customer_name', 'Customer name'], ['email', 'Email'], ['customer_phone', 'Phone'],
  ['customer_country', 'Country'], ['customer_company', 'Company'], ['customer_address', 'Address', true],
  ['invoice_type', 'Type', false, ['proforma', 'deposit', 'commercial']], ['deposit_currency', 'Currency', false, ['USD', 'JPY', 'EUR']],
  ['deposit_amount', 'Amount due (e.g. 3000 USD)'], ['total_price', 'Total price'],
  ['payment_terms', 'Payment terms', false, ['', '100%', '50%', '30%']], ['deposit_purpose', 'Purpose'],
  ['description', 'Payment description', true], ['make', 'Make'], ['model', 'Model'], ['vehicle_ref', 'Stock ref'],
  ['chasis_number', 'Chassis'], ['mileage', 'Mileage'], ['engine_capacity', 'Engine'],
  ['destination_country', 'Destination country'], ['destination_port', 'Port of discharge'],
  ['pre_export_inspection', 'Pre-export inspection', false, ['', 'Included', 'Not Included']],
  ['bank_note', 'Note from the remitter', true],
];

export default function Invoices({ showMessage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // admin.js recreates showMessage every render; keep it out of the deps so the
  // list isn't refetched in a loop.
  const showMessageRef = useRef(showMessage);
  showMessageRef.current = showMessage;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const result = await adminApiFetch('finance/invoices/adminFetchInvoices.php');
    if (Array.isArray(result)) setItems(result);
    else if (result?.error) showMessageRef.current(result.error, 'error');
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (invoiceNumber) => {
    if (!confirm('Delete this invoice?')) return;
    const result = await adminApiFetch(`finance/invoices/manageInvoices.php?invoice_number=${encodeURIComponent(invoiceNumber)}`, { method: 'DELETE' });
    if (result?.success) { showMessage('Deleted', 'success'); fetchItems(); }
    else showMessage(result?.error || 'Failed to delete', 'error');
  };

  const handleStatus = async (inv, status) => {
    if (status === 'cancelled' && !confirm(`Cancel invoice ${inv.invoice_number}?`)) return;
    setBusyId(inv.id);
    const result = await adminApiFetch('finance/invoices/manageInvoices.php', { method: 'PUT', body: { action: 'status', id: inv.id, status } });
    setBusyId(null);
    if (result?.success) {
      showMessage(result.success, 'success');
      fetchItems();
      setDetailItem((d) => (d && d.id === inv.id ? { ...d, status } : d));
    } else showMessage(result?.error || 'Could not change the status', 'error');
  };

  const openEdit = (inv) => {
    setEditItem(inv);
    setEditForm(Object.fromEntries(EDIT_FIELDS.map(([key]) => [key, inv[key] ?? ''])));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await adminApiFetch('finance/invoices/manageInvoices.php', { method: 'PUT', body: { action: 'update', id: editItem.id, ...editForm } });
    setSaving(false);
    if (result?.success) { showMessage('Invoice updated', 'success'); setEditItem(null); fetchItems(); }
    else showMessage(result?.error || 'Could not save', 'error');
  };

  const handleRegenerate = (inv) => {
    const parsed = parseAmount(inv.deposit_amount);
    const invoiceData = {
      make:                  inv.make || '',
      model:                 inv.model || '',
      vehicle_ref:           inv.vehicle_ref || '',
      chasis_number:         inv.chasis_number || '',
      engine_capacity:       inv.engine_capacity || '',
      mileage:               inv.mileage || '',
      vehicle_description:   inv.vehicle_description || '',
      deposit_amount:        parsed && typeof parsed === 'object' ? parsed.num : inv.deposit_amount || '',
      deposit_currency:      currencyOf(inv) || 'USD',
      deposit_purpose:       inv.deposit_purpose || 'Paying My Vehicle',
      description:           inv.description || '',
      customer_name:         inv.customer_name || '',
      email:                 inv.email || '',
      customer_phone:        inv.customer_phone || '',
      customer_country:      inv.customer_country || '',
      customer_company:      inv.customer_company || '',
      customer_address:      inv.customer_address || '',
      invoice_type:          inv.invoice_type || 'deposit',
      total_price:           inv.total_price || '',
      payment_terms:         inv.payment_terms || '',
      destination_country:   inv.destination_country || '',
      destination_port:      inv.destination_port || '',
      pre_export_inspection: inv.pre_export_inspection || '',
      bank_note:             inv.bank_note || '',
      invoice_number:        inv.invoice_number || '',
      created_at:            inv.created_at || '',
    };
    const payloadString = JSON.stringify(invoiceData);
    try { sessionStorage.setItem('invoiceData', payloadString); } catch {}
    try { localStorage.setItem('invoiceData', payloadString); } catch {}
    window.open('/invoice-generator?regenerate=true', '_blank', 'noopener,noreferrer');
  };

  const counts = useMemo(() => {
    const c = { all: items.length };
    STATUSES.forEach((s) => { c[s] = items.filter((i) => (i.status || 'draft') === s).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((inv) => {
      if (statusFilter !== 'all' && (inv.status || 'draft') !== statusFilter) return false;
      if (!words.length) return true;
      const hay = [inv.invoice_number, inv.customer_name, inv.email, inv.make, inv.model, inv.vehicle_ref, inv.customer_company]
        .filter(Boolean).join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [items, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  useEffect(() => {
    const max = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (page > max) setPage(max);
  }, [filtered.length, itemsPerPage, page]);

  const openCreate = () => {
    window.open('/invoice-generator', '_blank', 'noopener,noreferrer');
  };

  const rowActions = (inv) => (
    <>
      <button onClick={() => setDetailItem(inv)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition" title="Details"><i className="fas fa-eye text-sm" /></button>
      <button onClick={() => openEdit(inv)} className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 transition" title="Edit record"><i className="fas fa-pen text-sm" /></button>
      <button onClick={() => handleRegenerate(inv)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition" title="Regenerate invoice (new PDF + email)"><i className="fas fa-sync-alt text-sm" /></button>
      <button onClick={() => handleDelete(inv.invoice_number)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition" title="Delete"><i className="fas fa-trash-alt text-sm" /></button>
    </>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-bebas text-xl md:text-2xl tracking-wide" style={{ color: NAVY }}>Invoices</h3>
          <div className="flex gap-2 flex-wrap">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, customer, vehicle…"
              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none w-full sm:w-56"
              style={{ borderColor: '#d1d5db' }}
              aria-label="Search invoices"
            />
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
              className="border-2 border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs focus:outline-none" style={{ borderColor: '#d1d5db' }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button onClick={openCreate}
              className="text-white px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase hover:opacity-90 transition flex items-center gap-1" style={{ backgroundColor: NAVY }}>
              <i className="fas fa-plus" /> Create
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filter by status">
          {['all', ...STATUSES].map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition ${statusFilter === s ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}
              style={statusFilter === s ? { backgroundColor: NAVY } : undefined}
            >
              {s} <span className="opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><i className="fas fa-circle-notch animate-spin text-2xl" style={{ color: NAVY }} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 sm:py-12 text-gray-400">
          <i className="fas fa-file-invoice text-3xl sm:text-4xl mb-2 sm:mb-3 block" />
          <p className="font-bold text-sm sm:text-base">{items.length ? 'No invoices match these filters' : 'No invoices yet'}</p>
        </div>
      ) : (
        <>
          <div className="md2:hidden space-y-3 p-4">
            {pagedItems.map((inv) => (
              <div key={inv.id || inv.invoice_number} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold text-gray-800">{inv.invoice_number}</p>
                    <p className="text-[10px] text-gray-400 truncate">{inv.customer_name}</p>
                  </div>
                  <StatusBadge inv={inv} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 truncate flex-1 min-w-0 mr-2">{vehicleLabel(inv)}</span>
                  <span className="text-right">
                    <span className="font-extrabold text-gray-900 whitespace-nowrap block">{amountLabel(inv)}</span>
                    {totalLabel(inv) && <span className="text-[10px] text-gray-400">{totalLabel(inv)}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2 flex-wrap">
                  <StatusActions inv={inv} onChange={handleStatus} busy={busyId === inv.id} />
                  <div className="flex gap-1 items-center shrink-0 ml-auto">{rowActions(inv)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md2:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Invoice #</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Vehicle</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap w-px">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedItems.map((inv) => (
                  <tr key={inv.id || inv.invoice_number} className="hover:bg-gray-50 transition">
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="font-mono text-[10px] md:text-xs font-semibold text-gray-900">{inv.invoice_number}</p>
                      <p className="text-[9px] text-gray-400">
                        {[TYPE_LABELS[inv.invoice_type], fmtDate(inv.invoice_date || inv.created_at)].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="font-semibold text-gray-900">{inv.customer_name}</p>
                      <p className="text-[10px] text-gray-400">{inv.email}</p>
                      {inv.created_by_name && <p className="text-[9px] text-gray-300">by {inv.created_by_name}</p>}
                    </td>
                    <td className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4 text-gray-600">{vehicleLabel(inv)}</td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">{amountLabel(inv)}</p>
                      {totalLabel(inv) && <p className="text-[10px] text-gray-400">{totalLabel(inv)}</p>}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusBadge inv={inv} />
                        <StatusActions inv={inv} onChange={handleStatus} busy={busyId === inv.id} />
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-px">
                      <div className="flex gap-1 items-center">{rowActions(inv)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bebas text-xl" style={{ color: NAVY }}>Invoice Details</h3>
              <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close"><i className="fas fa-times text-xl" /></button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Invoice #"><span className="font-semibold font-mono">{detailItem.invoice_number}</span></Field>
                <Field label="Status"><div className="flex flex-col gap-1.5 items-start"><StatusBadge inv={detailItem} /><StatusActions inv={detailItem} onChange={handleStatus} busy={busyId === detailItem.id} /></div></Field>
                <Field label="Type">{TYPE_LABELS[detailItem.invoice_type]}</Field>
                <Field label="Invoice date">{fmtDate(detailItem.invoice_date || detailItem.created_at)}</Field>
                <Field label="Valid until">{fmtDate(detailItem.expiry_date)}</Field>
                <Field label="Created by">{detailItem.created_by_name}</Field>
                <Field label="Emailed">{fmtDate(detailItem.sent_at)}</Field>
                <Field label="Paid">{fmtDate(detailItem.paid_at)}</Field>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name" wide><span className="font-semibold">{detailItem.customer_name}</span></Field>
                  <Field label="Email">{detailItem.email}</Field>
                  <Field label="Phone">{detailItem.customer_phone}</Field>
                  <Field label="Company">{detailItem.customer_company}</Field>
                  <Field label="Country">{detailItem.customer_country}</Field>
                  <Field label="Address" wide>{detailItem.customer_address}</Field>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Vehicle</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Make / Model">{vehicleLabel(detailItem)}</Field>
                  <Field label="Stock ref">{detailItem.vehicle_ref}</Field>
                  <Field label="Chassis">{detailItem.chasis_number}</Field>
                  <Field label="Mileage">{formatNumberWithUnit(detailItem.mileage)}</Field>
                  <Field label="Engine">{formatNumberWithUnit(detailItem.engine_capacity)}</Field>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Payment</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Due now"><span className="font-semibold">{amountLabel(detailItem)}</span></Field>
                  <Field label="Total price">{Number(detailItem.total_price) ? `${currencyOf(detailItem)} ${Number(detailItem.total_price).toLocaleString()}` : null}</Field>
                  <Field label="Payment terms">{detailItem.payment_terms}</Field>
                  <Field label="Purpose">{detailItem.deposit_purpose}</Field>
                  <Field label="Description" wide>{detailItem.description}</Field>
                  {detailItem.bank_note && <Field label="Note from the remitter" wide>{detailItem.bank_note}</Field>}
                </div>
              </div>

              {(detailItem.destination_country || detailItem.destination_port || detailItem.pre_export_inspection) && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Shipping</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Destination">{detailItem.destination_country}</Field>
                    <Field label="Port of discharge">{detailItem.destination_port}</Field>
                    <Field label="Pre-export inspection">{detailItem.pre_export_inspection}</Field>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditItem(null)}>
          <form onSubmit={saveEdit} className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bebas text-xl" style={{ color: NAVY }}>Edit {editItem.invoice_number}</h3>
              <button type="button" onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close"><i className="fas fa-times text-xl" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Changes the stored record only. To send the customer a corrected PDF, use Regenerate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EDIT_FIELDS.map(([key, label, wide, options]) => (
                <label key={key} className={`text-xs ${wide ? 'sm:col-span-2' : ''}`}>
                  <span className="block font-bold text-gray-500 mb-1">{label}</span>
                  {options ? (
                    <select
                      id={`edit-${key}`}
                      value={editForm[key] ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                      {options.map((o) => <option key={o} value={o}>{o || 'Not specified'}</option>)}
                    </select>
                  ) : wide ? (
                    <textarea
                      id={`edit-${key}`}
                      rows={2}
                      value={editForm[key] ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    />
                  ) : (
                    <input
                      id={`edit-${key}`}
                      value={editForm[key] ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold uppercase text-white disabled:opacity-60" style={{ backgroundColor: NAVY }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

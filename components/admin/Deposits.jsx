// Income management (ported from ichinomiya-motors): record received
// payments, set them to a customer, then "consume" them against that
// customer's reservations. Backend: server/finance/income/.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApiFetch } from './adminApi';
import Pagination from './Pagination';

const emptyForm = {
  date: new Date().toISOString().split('T')[0], amount: '', currency: 'USD',
  remitter: '', country: '', swift_details: '', note: '', bank_fees: '0'
};

// Whole amounts without decimals, anything else with both cents (3,607.60).
const money = (cur, n) => {
  const v = Number(n || 0);
  const cents = Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2;
  return `${cur} ${v.toLocaleString('en-US', { minimumFractionDigits: cents, maximumFractionDigits: 2 })}`;
};
const inputCls = 'w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary';
const labelCls = 'block text-[10px] font-extrabold text-gray-400 uppercase mb-1';

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl ${wide ? 'max-w-2xl' : 'max-w-lg'} w-full max-h-[90vh] overflow-y-auto p-6`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bebas text-xl text-primary">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Read-only income summary shown at the top of the Set Customer / Consume panels
function IncomeSummary({ d }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs mb-4">
      <div><span className={labelCls}>Date</span><p className="font-semibold text-gray-800">{d.date}</p></div>
      <div><span className={labelCls}>Amount</span><p className="font-semibold text-gray-800">{money(d.currency, d.amount)}</p></div>
      <div><span className={labelCls}>Remitter</span><p className="font-semibold text-gray-800 truncate">{d.remitter || '-'}</p></div>
      <div><span className={labelCls}>Still available</span><p className="font-semibold text-green-600">{money(d.currency, d.leftover)}</p></div>
    </div>
  );
}

function CustomerBadge({ d }) {
  if (!d.user_id) return <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">Not set</span>;
  return <span className="text-gray-700 font-semibold">{d.user_name || `#${d.user_id}`}</span>;
}

function SetCustomerModal({ deposit, onClose, onDone, showMessage, userRole, userId }) {
  const [q, setQ] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  // Suggestions update as you type (debounced; stale responses are ignored)
  useEffect(() => {
    let stale = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      // The server already limits sales to customers they are in charge of (or nobody is)
      const r = await adminApiFetch('finance/income/searchCustomers.php', { query: `search=${encodeURIComponent(q.trim())}` });
      if (stale) return;
      const list = r.success ? r.users : [];
      setCustomers(list.slice(0, 30));
      setLoading(false);
    }, 250);
    return () => { stale = true; clearTimeout(timer); };
  }, [q, userRole, userId]);

  const save = async () => {
    setSaving(true);
    const r = await adminApiFetch('finance/income/manageIncome.php', { method: 'POST', body: { action: 'set_customer', id: deposit.id, user_id: selected.id } });
    setSaving(false);
    if (r.success) { showMessage('Customer set — they can now see this income', 'success'); onDone(); }
    else showMessage(r.error || 'Failed', 'error');
  };

  return (
    <Modal title="Set Customer" onClose={onClose}>
      <IncomeSummary d={deposit} />
      <div className="relative mb-3">
        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Start typing a name, email or phone..." className={`${inputCls} pl-9 pr-9`} />
        {loading && <i className="fas fa-circle-notch animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary text-sm" />}
      </div>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto mb-4">
        {customers.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6">{loading ? 'Searching...' : 'No customers found'}</p>
        ) : customers.map(c => (
          <label key={c.id} className={`flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${selected?.id === c.id ? 'bg-primary/5' : ''}`}>
            <input type="radio" name="customer" checked={selected?.id === c.id} onChange={() => setSelected(c)} className="mt-1" />
            <div className="min-w-0 text-xs">
              <p className="font-bold text-gray-800">{c.full_name}{c.company && c.company !== 'N/A' ? ` · ${c.company}` : ''}</p>
              <p className="text-gray-500 truncate">{c.email}{c.phone ? ` · ${c.phone}` : ''}{c.country ? ` · ${c.country}` : ''}</p>
              {c.created_by_name && <p className="text-[10px] text-gray-400">Staff: {c.created_by_name}</p>}
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-6 py-2 rounded-lg text-xs font-bold uppercase text-gray-600 border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={save} disabled={!selected || saving} className="bg-primary text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-primary/90 transition disabled:opacity-50">
          {saving ? <i className="fas fa-circle-notch animate-spin" /> : 'Set Customer'}
        </button>
      </div>
    </Modal>
  );
}

const PCTS = [30, 50, 100];

function ConsumeModal({ deposit, onClose, onDone, showMessage }) {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resId, setResId] = useState(null);
  const [pct, setPct] = useState(null); // 30 | 50 | 100 | 'manual'
  const [manual, setManual] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await adminApiFetch('finance/income/getIncomes.php', { query: `consume_targets=${deposit.id}` });
      if (r.success) setTargets(r.reservations);
      else showMessage(r.error || 'Failed to load vehicles', 'error');
      setLoading(false);
    })();
  }, [deposit.id, showMessage]);

  const res = targets.find(t => t.id === resId);
  const remaining = res ? Math.max(0, Number(res.agreed_price) - Number(res.amount_paid)) : 0;
  const cap = Math.min(Number(deposit.leftover), remaining);
  const wanted = !res || !pct ? 0 : pct === 'manual' ? Number(manual) || 0 : Math.round(Number(res.agreed_price) * pct) / 100;
  const amount = pct === 'manual' ? wanted : Math.min(wanted, cap);
  const capped = pct && pct !== 'manual' && wanted > cap;
  const invalid = !res || amount <= 0 || amount > cap + 0.001;

  const save = async () => {
    setSaving(true);
    const r = await adminApiFetch('finance/income/manageIncome.php', {
      method: 'POST',
      body: { action: 'consume', id: deposit.id, reservation_id: resId, amount: Math.round(amount * 100) / 100, percent: pct === 'manual' ? null : pct },
    });
    setSaving(false);
    if (r.success) { showMessage('Consumed', 'success'); onDone(); }
    else showMessage(r.error || 'Failed', 'error');
  };

  return (
    <Modal title={`Consume — ${deposit.user_name || 'Customer'}`} onClose={onClose} wide>
      <IncomeSummary d={deposit} />

      <span className={labelCls}>1. Choose vehicle</span>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto mb-4">
        {loading ? (
          <div className="flex justify-center py-6"><i className="fas fa-circle-notch animate-spin text-primary" /></div>
        ) : targets.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6">This customer has no active reservations</p>
        ) : targets.map(t => {
          const rem = Math.max(0, Number(t.agreed_price) - Number(t.amount_paid));
          const wrongCur = (t.currency || 'USD') !== (deposit.currency || 'USD');
          const disabled = wrongCur || rem <= 0;
          return (
            <label key={t.id} className={`flex items-start gap-3 px-3 py-2 text-xs ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${resId === t.id ? 'bg-primary/5' : ''}`}>
              <input type="radio" name="res" disabled={disabled} checked={resId === t.id} onChange={() => setResId(t.id)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{t.vehicle_name || 'Vehicle'} <span className="text-gray-400 font-normal">· Ref {t.vehicle_ref}</span></p>
                <p className="text-gray-500">
                  Total {money(t.currency, t.agreed_price)} · Paid <span className="text-green-600">{money(t.currency, t.amount_paid)}</span> · Remaining <span className="text-amber-600">{money(t.currency, rem)}</span>
                </p>
                {wrongCur && <p className="text-[10px] text-red-500">Different currency ({t.currency})</p>}
                {!wrongCur && rem <= 0 && <p className="text-[10px] text-green-600">Fully paid</p>}
              </div>
            </label>
          );
        })}
      </div>

      <span className={labelCls}>2. How much</span>
      <div className="flex flex-wrap gap-2 mb-3">
        {PCTS.map(p => (
          <button key={p} type="button" disabled={!res} onClick={() => setPct(p)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition disabled:opacity-40 ${pct === p ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {p}%
          </button>
        ))}
        <button type="button" disabled={!res} onClick={() => setPct('manual')}
          className={`px-4 py-2 rounded-lg text-xs font-bold border transition disabled:opacity-40 ${pct === 'manual' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          Manual
        </button>
      </div>
      {pct === 'manual' && (
        <input type="number" step="0.01" min="0" value={manual} onChange={e => setManual(e.target.value)} placeholder={`Max ${cap}`} className={`${inputCls} mb-3`} />
      )}
      {res && pct && (
        <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 mb-4 space-y-1">
          <p>Apply <b className="text-primary">{money(deposit.currency, amount)}</b> to {res.vehicle_name || res.vehicle_ref}</p>
          {capped && <p className="text-amber-600">{pct}% of the vehicle total is {money(deposit.currency, wanted)} — capped to what is available.</p>}
          {pct === 'manual' && amount > cap + 0.001 && <p className="text-red-500">Maximum is {money(deposit.currency, cap)}.</p>}
          <p className="text-gray-500">After: still available on this payment {money(deposit.currency, Number(deposit.leftover) - amount)} · vehicle remaining {money(res.currency, remaining - amount)}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-6 py-2 rounded-lg text-xs font-bold uppercase text-gray-600 border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={save} disabled={invalid || saving} className="bg-primary text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-primary/90 transition disabled:opacity-50">
          {saving ? <i className="fas fa-circle-notch animate-spin" /> : 'Consume'}
        </button>
      </div>
    </Modal>
  );
}

export default function Deposits({ showMessage, userRole, userId, userName }) {
  const isAdmin = userRole === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [setCustomerItem, setSetCustomerItem] = useState(null);
  const [consumeItem, setConsumeItem] = useState(null);
  const [undoId, setUndoId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchItems = useCallback(async (q = '', f = '') => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (f) params.set('filter', f);
    const result = await adminApiFetch('finance/income/getIncomes.php', { query: params.toString() });
    if (result.success) setItems(result.deposits);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(search, filter); }, [fetchItems, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => fetchItems(search, filter);
  const detailItem = items.find(d => d.id === detailId);
  const undoItem = items.find(d => d.id === undoId);

  const canHandle = (d) => isAdmin || !d.user_staff_id || Number(d.user_staff_id) === Number(userId);

  const handleSearch = (e) => { e.preventDefault(); refresh(); };

  const openCreate = () => { setEditItem(null); setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] }); setShowForm(true); };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      date: item.date || '', amount: item.amount || '', currency: item.currency || 'USD',
      remitter: item.remitter || '', country: item.country || '',
      swift_details: item.swift_details || '', note: item.note || '',
      bank_fees: item.bank_fees || '0'
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await adminApiFetch('finance/income/manageIncome.php', {
      method: 'POST', body: { action: editItem ? 'update' : 'create', id: editItem?.id, ...form }
    });
    if (result.success) { showMessage(result.message, 'success'); setShowForm(false); refresh(); }
    else showMessage(result.error || 'Failed to save', 'error');
  };

  const post = async (body, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const result = await adminApiFetch('finance/income/manageIncome.php', { method: 'POST', body });
    if (result.success) { showMessage(result.message, 'success'); refresh(); }
    else showMessage(result.error || 'Failed', 'error');
  };

  const handleDelete = (id) => post({ action: 'delete', id }, 'Delete this income?');
  const handleUnset = (id) => post({ action: 'unset_customer', id }, 'Remove the customer from this income? They will no longer see it.');
  const handleUnconsume = (allocation_id) => post({ action: 'unconsume', allocation_id }, 'Undo this consumption? The amount goes back to the income leftover.');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, page, itemsPerPage]);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(items.length / itemsPerPage));
    if (page > max) setPage(max);
  }, [items.length, itemsPerPage, page]);

  const RowActions = ({ d, size = 'text-sm' }) => (
    <div className="flex gap-2 items-center flex-wrap">
      {!d.user_id && (
        <button onClick={() => setSetCustomerItem(d)} className="bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-amber-600 transition whitespace-nowrap"><i className="fas fa-user-plus mr-1" />Set customer</button>
      )}
      {d.user_id && isAdmin && Number(d.consumed) === 0 && (
        <button onClick={() => handleUnset(d.id)} className="border border-red-300 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-50 transition whitespace-nowrap"><i className="fas fa-user-times mr-1" />Remove customer</button>
      )}
      {d.user_id && Number(d.leftover) > 0 && canHandle(d) && (
        <button onClick={() => setConsumeItem(d)} className="bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-green-700 transition whitespace-nowrap"><i className="fas fa-car mr-1" />Consume</button>
      )}
      {Number(d.consumed) > 0 && canHandle(d) && (
        <button onClick={() => setUndoId(d.id)} className="border border-gray-300 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-gray-50 transition whitespace-nowrap"><i className="fas fa-undo mr-1" />Undo</button>
      )}
      <button onClick={() => setDetailId(d.id)} className={`text-gray-400 hover:text-gray-600 transition ${size}`}><i className="fas fa-eye" /></button>
      {isAdmin && <button onClick={() => openEdit(d)} className={`text-primary hover:text-primary/70 transition ${size}`}><i className="fas fa-edit" /></button>}
      {isAdmin && Number(d.consumed) === 0 && <button onClick={() => handleDelete(d.id)} className={`text-red-400 hover:text-red-600 transition ${size}`}><i className="fas fa-trash-alt" /></button>}
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <h3 className="font-bebas text-xl md:text-2xl text-primary tracking-wide">Income Management</h3>
        <div className="flex gap-2 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2 text-sm focus:outline-none focus:border-primary w-32 md:w-48" />
            <button type="submit" className="bg-primary text-white px-3 md:px-4 rounded-lg hover:bg-primary/90 transition"><i className="fas fa-search text-sm" /></button>
          </form>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="border-2 border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs focus:outline-none focus:border-primary">
            <option value="">All</option>
            <option value="unset">Customer not set</option>
            <option value="set">Customer set</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
            className="border-2 border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs focus:outline-none focus:border-primary"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          {isAdmin && <button onClick={openCreate} className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-green-700 transition flex items-center gap-1"><i className="fas fa-plus" /> Record Income</button>}
        </div>
      </div>

      {showForm && (
        <Modal title={editItem ? 'Edit Income' : 'Record Income'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1"><label className={labelCls}>Date *</label><input name="date" type="date" value={form.date} onChange={handleChange} required className={inputCls} /></div>
            <div className="col-span-2 sm:col-span-1"><label className={labelCls}>Amount *</label><input name="amount" type="number" step="0.01" min="0.01" value={form.amount} onChange={handleChange} required className={inputCls} /></div>
            <div><label className={labelCls}>Currency</label><select name="currency" value={form.currency} onChange={handleChange} className={`${inputCls} bg-white`}><option value="USD">USD</option><option value="JPY">JPY</option><option value="EUR">EUR</option></select></div>
            <div><label className={labelCls}>Bank Fees</label><input name="bank_fees" type="number" step="0.01" value={form.bank_fees} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Remitter</label><input name="remitter" value={form.remitter} onChange={handleChange} className={inputCls} /></div>
            <div><label className={labelCls}>Country</label><input name="country" value={form.country} onChange={handleChange} className={inputCls} /></div>
            <div className="col-span-2"><label className={labelCls}>Staff</label><p className="text-sm text-gray-700 py-2">{editItem ? (editItem.staff || '-') : (userName || '-')}</p></div>
            <div className="col-span-2"><label className={labelCls}>SWIFT Details</label><textarea name="swift_details" value={form.swift_details} onChange={handleChange} rows={2} className={inputCls} /></div>
            <div className="col-span-2"><label className={labelCls}>Note (internal)</label><textarea name="note" value={form.note} onChange={handleChange} rows={2} className={inputCls} /></div>
            {!editItem && <p className="col-span-2 text-[11px] text-gray-400"><i className="fas fa-eye-slash mr-1" />Not visible to any customer until a customer is set.</p>}
            <div className="col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg text-xs font-bold uppercase text-gray-600 border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-primary/90 transition">{editItem ? 'Update' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {setCustomerItem && (
        <SetCustomerModal deposit={setCustomerItem} userRole={userRole} userId={userId} showMessage={showMessage}
          onClose={() => setSetCustomerItem(null)} onDone={() => { setSetCustomerItem(null); refresh(); }} />
      )}

      {undoItem && (
        <Modal title="Undo Consumption" onClose={() => setUndoId(null)}>
          <IncomeSummary d={undoItem} />
          {undoItem.allocations.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">Nothing left to undo</p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 text-xs">
              {undoItem.allocations.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{a.vehicle_name || 'Vehicle'} <span className="text-gray-400 font-normal">· Ref {a.vehicle_ref}</span></p>
                    <p className="text-gray-400">{a.created_at}{a.created_by_name ? ` · ${a.created_by_name}` : ''}{Number(a.agreed_price) > 0 ? ` · ${Math.round(Number(a.amount) / Number(a.agreed_price) * 100)}% of its price` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-gray-900">{money(undoItem.currency, a.amount)}</span>
                    <button onClick={() => handleUnconsume(a.id)} className="border border-red-300 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-50 transition"><i className="fas fa-undo mr-1" />Undo</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-3">Undoing returns the amount to this income and adds it back to the vehicle's remaining balance.</p>
        </Modal>
      )}

      {consumeItem && (
        <ConsumeModal deposit={consumeItem} showMessage={showMessage}
          onClose={() => setConsumeItem(null)} onDone={() => { setConsumeItem(null); refresh(); }} />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><i className="fas fa-circle-notch animate-spin text-2xl text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 sm:py-12 text-gray-400">
          <i className="fas fa-coins text-3xl sm:text-4xl mb-2 sm:mb-3 block" />
          <p className="font-bold text-sm sm:text-base">No income recorded</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md2:hidden space-y-3 p-4">
            {pagedItems.map((d) => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 text-sm truncate">{d.remitter || '—'}</p>
                    <p className="text-[10px] text-gray-400">{d.date}</p>
                  </div>
                  <span className="font-extrabold text-gray-900 whitespace-nowrap">{money(d.currency, d.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs gap-2">
                  <CustomerBadge d={d} />
                  {d.user_id && <span className="text-[10px] text-gray-500">Available <b className="text-green-600">{money(d.currency, d.leftover)}</b></span>}
                </div>
                <RowActions d={d} />
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md2:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {['Date', 'Amount', 'Remitter', 'Customer', 'Applied', 'Available', 'Actions'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedItems.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-3 md:px-4 py-3 text-gray-500 whitespace-nowrap">{d.date}</td>
                    <td className="px-3 md:px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{money(d.currency, d.amount)}</td>
                    <td className="px-3 md:px-4 py-3 text-gray-600 truncate max-w-[140px]">{d.remitter || '-'}</td>
                    <td className="px-3 md:px-4 py-3"><CustomerBadge d={d} /></td>
                    <td className="px-3 md:px-4 py-3 text-gray-600 whitespace-nowrap">{Number(d.consumed) > 0 ? money(d.currency, d.consumed) : '-'}</td>
                    <td className="px-3 md:px-4 py-3 font-semibold text-green-600 whitespace-nowrap">{money(d.currency, d.leftover)}</td>
                    <td className="px-3 md:px-4 py-3"><RowActions d={d} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}

      {detailItem && (
        <Modal title="Income Details" onClose={() => setDetailId(null)} wide>
          {detailItem.user_id && (() => {
            const pct = Number(detailItem.amount) > 0 ? Math.min(100, (Number(detailItem.consumed) / Number(detailItem.amount)) * 100) : 0;
            return (
              <div className="border border-gray-200 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wide"><i className="fas fa-car text-primary mr-1.5" />Where this payment went</h4>
                  {Number(detailItem.leftover) > 0 && canHandle(detailItem) && (
                    <button onClick={() => { setDetailId(null); setConsumeItem(detailItem); }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-green-700 transition"><i className="fas fa-car mr-1" />Consume</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['Payment received', detailItem.amount, 'text-gray-900'], ['Applied to vehicles', detailItem.consumed, 'text-primary'], ['Still available', detailItem.leftover, 'text-green-600']].map(([label, val, cls]) => (
                    <div key={label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <span className={labelCls}>{label}</span>
                      <p className={`font-extrabold text-sm ${cls}`}>{money(detailItem.currency, val)}</p>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                {detailItem.allocations.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Not applied to any vehicle yet</p>
                ) : (
                  <div className="space-y-2">
                    {detailItem.allocations.map(a => (
                      <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2.5 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800">{money(detailItem.currency, a.amount)} applied to {a.vehicle_name || 'vehicle'}
                            {Number(a.agreed_price) > 0 && <span className="font-normal text-gray-500"> ({Math.round(Number(a.amount) / Number(a.agreed_price) * 100)}% of its price)</span>}
                          </p>
                          <p className="text-gray-500 mt-0.5">Vehicle total {money(a.currency, a.agreed_price)} · paid so far <span className="text-green-600 font-semibold">{money(a.currency, a.amount_paid)}</span> · remaining <span className="text-amber-600 font-semibold">{money(a.currency, a.amount_remaining)}</span></p>
                          <p className="text-gray-400">Ref {a.vehicle_ref} · {a.created_at}{a.created_by_name ? ` · by ${a.created_by_name}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {canHandle(detailItem) && (
                            <button onClick={() => handleUnconsume(a.id)} className="border border-red-300 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-red-50 transition"><i className="fas fa-undo mr-1" />Undo</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className={labelCls}>Date</span><p className="text-gray-900">{detailItem.date}</p></div>
            <div><span className={labelCls}>Amount</span><p className="text-gray-900 font-semibold">{money(detailItem.currency, detailItem.amount)}</p></div>
            <div><span className={labelCls}>Bank Fees</span><p className="text-gray-900">{Number(detailItem.bank_fees || 0).toLocaleString()}</p></div>
            <div><span className={labelCls}>Remitter</span><p className="text-gray-900">{detailItem.remitter || '-'}</p></div>
            <div><span className={labelCls}>Country</span><p className="text-gray-900">{detailItem.country || '-'}</p></div>
            <div><span className={labelCls}>Staff</span><p className="text-gray-900">{detailItem.staff || '-'}</p></div>
            <div>
              <span className={labelCls}>Customer</span>
              <p className="text-gray-900"><CustomerBadge d={detailItem} /></p>
              {detailItem.user_id && <p className="text-[10px] text-gray-400">Set by {detailItem.assigned_by_name || '-'}{detailItem.assigned_at ? ` · ${detailItem.assigned_at}` : ''}</p>}
              {detailItem.user_id && isAdmin && Number(detailItem.consumed) === 0 && (
                <button onClick={() => handleUnset(detailItem.id)} className="mt-2 border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-red-50 transition"><i className="fas fa-user-times mr-1" />Remove customer</button>
              )}
            </div>
            <div className="col-span-2"><span className={labelCls}>SWIFT Details</span><p className="text-gray-900 whitespace-pre-wrap">{detailItem.swift_details || '-'}</p></div>
            <div className="col-span-2"><span className={labelCls}>Note</span><p className="text-gray-900 whitespace-pre-wrap">{detailItem.note || '-'}</p></div>
            {(detailItem.consumption_type || detailItem.consumption_value) && (
              <div className="col-span-2"><span className={labelCls}>Legacy consumption</span><p className="text-gray-500">{(detailItem.consumption_type || '').replace(/_/g, ' ')} {detailItem.consumption_value}</p></div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApiFetch } from './adminApi';
import Pagination from './Pagination';
const NAVY = '#1e3a8a';
const SKY = '#1da1f2';
const ORANGE = '#f1892b';

// Self-registered accounts start on the free stock preview (20 newest cars)
// until staff activate them — see server/core/stock_access.php. Staff and
// admin-created customer records always have full access.
const canToggleAccess = (u) => u.type === 'user' && !['admin', 'sales'].includes(u.role);
const isPending = (u) => canToggleAccess(u) && u.stock_access === 'free';

function AccessCell({ u, busy, onChange }) {
  if (!canToggleAccess(u)) {
    return <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-gray-50 border-gray-200 text-gray-400">Full</span>;
  }
  const pending = u.stock_access === 'free';
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border"
        style={pending ? { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' } : { backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
      >
        {pending ? 'Free preview' : 'Activated'}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => onChange(u, pending ? 'full' : 'free')}
        className="text-[10px] font-bold uppercase tracking-wide rounded px-2 py-1 transition disabled:opacity-50"
        style={pending ? { backgroundColor: ORANGE, color: '#fff' } : { color: '#6b7280' }}
        title={pending ? 'Unlock the full stock and email the customer' : 'Return to the free 20-car preview'}
      >
        {busy ? <i className="fas fa-circle-notch animate-spin" /> : pending ? 'Activate' : 'Revoke'}
      </button>
    </div>
  );
}

export default function CustomerList({ showMessage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', country: '', role: 'customer' });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [accessBusyId, setAccessBusyId] = useState(null);

  const fetchItems = useCallback(async (q) => {
    setLoading(true);
    const result = await adminApiFetch('users/getUsers.php');
    if (result?.status === 'success' && Array.isArray(result.data)) {
      let filtered = result.data;
      if (q) {
        const s = q.toLowerCase();
        filtered = filtered.filter(u =>
          (u.full_name || '').toLowerCase().includes(s) ||
          (u.email || '').toLowerCase().includes(s) ||
          (u.phone || '').toLowerCase().includes(s)
        );
      }
      setItems(filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleSearch = (e) => { e.preventDefault(); fetchItems(search); };

  const openEdit = (u) => {
    setEditItem(u);
    setForm({ full_name: u.full_name || '', email: u.email || '', phone: u.phone || '', country: u.country || '', role: u.role || 'customer' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await adminApiFetch('users/updateUser.php', { method: 'POST', body: { id: editItem.id, ...form } });
    if (result?.status === 'success') { showMessage('Customer updated', 'success'); setShowForm(false); fetchItems(search); }
    else showMessage(result?.message || 'Failed to update', 'error');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    const result = await adminApiFetch('users/deleteUser.php', { method: 'POST', body: { id } });
    if (result?.status === 'success') { showMessage('Deleted', 'success'); fetchItems(search); }
    else showMessage(result?.message || 'Failed to delete', 'error');
  };

  const handleAccess = async (u, access) => {
    if (access === 'free' && !confirm(`Return ${u.full_name || u.email} to the free 20-car preview?`)) return;
    setAccessBusyId(u.id);
    const result = await adminApiFetch('users/setStockAccess.php', { method: 'POST', body: { user_id: u.id, access } });
    setAccessBusyId(null);
    if (result?.status === 'success') {
      setItems(prev => prev.map(i => (i.type === 'user' && i.id === u.id ? { ...i, stock_access: access } : i)));
      if (access === 'full') showMessage(result.emailed ? 'Account activated; customer notified by email' : 'Account activated (activation email could not be sent)', 'success');
      else showMessage('Access returned to free preview', 'success');
    } else showMessage(result?.message || 'Failed to update access', 'error');
  };

  const handleImpersonate = async (id) => {
    const result = await adminApiFetch('users/impersonate.php', { method: 'POST', body: { user_id: id } });
    if (result?.status === 'success') { window.location.href = '/'; }
    else showMessage(result?.message || 'Failed to impersonate', 'error');
  };

  const pendingCount = useMemo(() => items.filter(isPending).length, [items]);
  const visibleItems = useMemo(() => (pendingOnly ? items.filter(isPending) : items), [items, pendingOnly]);

  const totalPages = Math.ceil(visibleItems.length / itemsPerPage);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return visibleItems.slice(start, start + itemsPerPage);
  }, [visibleItems, page, itemsPerPage]);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(visibleItems.length / itemsPerPage));
    if (page > max) setPage(max);
  }, [visibleItems.length, itemsPerPage, page]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <h3 className="font-bebas text-xl md:text-2xl tracking-wide" style={{ color: NAVY }}>Customer Management</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setPendingOnly(v => !v); setPage(1); }}
            className="border-2 rounded-lg px-3 py-2 text-xs font-bold transition"
            style={pendingOnly ? { backgroundColor: ORANGE, borderColor: ORANGE, color: '#fff' } : { borderColor: '#d1d5db', color: '#4b5563' }}
          >
            Awaiting activation ({pendingCount})
          </button>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2 text-sm focus:outline-none w-32 md:w-48" style={{ borderColor: '#d1d5db' }} />
            <button type="submit" className="text-white px-3 md:px-4 rounded-lg hover:opacity-90 transition" style={{ backgroundColor: NAVY }}><i className="fas fa-search text-sm" /></button>
          </form>
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }} className="border-2 border-gray-200 rounded-lg px-2 md:px-3 py-2 text-xs focus:outline-none" style={{ borderColor: '#d1d5db' }}>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
<div className="flex justify-between items-center mb-4">
              <h3 className="font-bebas text-xl" style={{ color: NAVY }}>Edit Customer</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Full Name *</label>
                <input type="text" required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#d1d5db' }} />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#d1d5db' }} />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#d1d5db' }} />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Country</label>
                <input type="text" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#d1d5db' }} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold text-sm rounded-lg py-2 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" className="flex-1 text-white font-bold text-sm rounded-lg py-2 hover:opacity-90 transition" style={{ backgroundColor: NAVY }}>Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><i className="fas fa-circle-notch animate-spin text-2xl text-primary" /></div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-10 sm:py-12 text-gray-400">
          <i className="fas fa-users text-3xl sm:text-4xl mb-2 sm:mb-3 block" />
          <p className="font-bold text-sm sm:text-base">No customers found</p>
        </div>
      ) : (
        <>
          <div className="md2:hidden space-y-3 p-4">
            {pagedItems.map((u) => (
              <div key={`${u.type}-${u.id}`} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 text-sm truncate">{u.full_name || '—'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-gray-50 border-gray-200 text-gray-500">{u.role || 'customer'}</span>
                </div>
                <AccessCell u={u} busy={accessBusyId === u.id} onChange={handleAccess} />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{u.country || '—'}</span>
                  <div className="flex gap-1.5 items-center shrink-0">
                    <button onClick={() => setDetailItem(u)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition" title="Details"><i className="fas fa-eye text-sm" /></button>
                    <button onClick={() => openEdit(u)} className="text-primary hover:text-primary/70 p-1 rounded hover:bg-primary/5 transition" title="Edit"><i className="fas fa-edit text-sm" /></button>
                    <button onClick={() => handleImpersonate(u.id)} className="text-amber-500 hover:text-amber-700 p-1 rounded hover:bg-amber-50 transition" title="Login as user"><i className="fas fa-mask text-sm" /></button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition" title="Delete"><i className="fas fa-trash-alt text-sm" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md2:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Name</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Email / Phone</th>
                  <th className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Country</th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Stock access</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap w-px">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedItems.map((u) => (
                  <tr key={`${u.type}-${u.id}`} className="hover:bg-gray-50 transition">
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="font-semibold text-gray-900">{u.full_name || '—'}</p>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <p className="text-gray-600">{u.email || '—'}</p>
                      {u.phone && <p className="text-[10px] text-gray-400">{u.phone}</p>}
                    </td>
                    <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 text-gray-600">{u.country || '—'}</td>
                    <td className="hidden md:table-cell px-3 md:px-6 py-3 md:py-4">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-gray-50 border-gray-200 text-gray-500">{u.role || 'customer'}</span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <AccessCell u={u} busy={accessBusyId === u.id} onChange={handleAccess} />
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-px">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setDetailItem(u)} className="text-gray-400 hover:text-gray-600 transition" title="Details"><i className="fas fa-eye text-sm" /></button>
                        <button onClick={() => openEdit(u)} className="text-primary hover:text-primary/70 transition" title="Edit"><i className="fas fa-edit text-sm" /></button>
                        <button onClick={() => handleImpersonate(u.id)} className="text-amber-500 hover:text-amber-700 transition" title="Login as user"><i className="fas fa-mask text-sm" /></button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-600 transition" title="Delete"><i className="fas fa-trash-alt text-sm" /></button>
                      </div>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
<div className="flex justify-between items-center mb-4">
              <h3 className="font-bebas text-xl" style={{ color: NAVY }}>Customer Details</h3>
              <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg" style={{ backgroundColor: NAVY }}>{(detailItem.full_name || '?')[0]}</div>
                <div>
                  <p className="font-bold text-gray-900">{detailItem.full_name || '—'}</p>
                  <p className="text-xs text-gray-500">{detailItem.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Email</span><p className="text-gray-700">{detailItem.email || '—'}</p></div>
                <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Phone</span><p className="text-gray-700">{detailItem.phone || '—'}</p></div>
                <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Country</span><p className="text-gray-700">{detailItem.country || '—'}</p></div>
                <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Role</span><p className="text-gray-700 capitalize">{detailItem.role || 'customer'}</p></div>
                {detailItem.created_at && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Registered</span><p className="text-gray-700">{new Date(detailItem.created_at).toLocaleDateString()}</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

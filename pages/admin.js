import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../components/user/userContext';
import { adminApiFetch } from '../components/admin/adminApi';
import CarManagement from '../components/admin/CarManagement';
import CustomerList from '../components/admin/CustomerList';
import Deposits from '../components/admin/Deposits';
import Invoices from '../components/admin/Invoices';
import AdminManagement from '../components/admin/AdminManagement';
import Inquiries from '../components/admin/Inquiries';

const NAVY = '#1e3a8a';

function AdminSettings({ showMessage }) {
  const [form, setForm]       = useState({ email: '', password: '', confirm: '', current_pass: '' });
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email && !form.password) {
      showMessage('Enter a new email or a new password', 'error'); return;
    }
    if (form.password && form.password.length < 8) {
      showMessage('The new password must be at least 8 characters', 'error'); return;
    }
    if (form.password && form.password !== form.confirm) {
      showMessage('New passwords do not match', 'error'); return;
    }
    if (!form.current_pass) {
      showMessage('Enter your current password to save changes', 'error'); return;
    }
    setSaving(true);
    // Own-account endpoint: checks current_pass and hashes the new password.
    // (updateUser.php is for editing other people and ignores passwords.)
    const res = await adminApiFetch('users/updateOwnAccount.php', {
      method: 'POST',
      body: { email: form.email, password: form.password, current_pass: form.current_pass },
    });
    setSaving(false);
    if (res?.status === 'success') {
      showMessage('Account updated successfully', 'success');
      setForm({ email: '', password: '', confirm: '', current_pass: '' });
    } else {
      showMessage(res?.message || 'Update failed', 'error');
    }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );

  return (
    <div className="max-w-md mx-auto pt-4">
      <h2 className="font-bebas text-2xl text-gray-800 tracking-wider mb-1">Account Settings</h2>
      <p className="text-xs text-gray-400 mb-6">Leave a field blank to keep it unchanged.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {field('New Email', 'email', 'email', 'Leave blank to keep current email')}
        {field('New Password', 'password', 'password', 'Min 8 characters')}
        {field('Confirm New Password', 'confirm', 'password', 'Repeat new password')}
        <div className="border-t pt-4">
          {field('Current Password *', 'current_pass', 'password', 'Required to save any change')}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {saving ? <><i className="fas fa-circle-notch animate-spin mr-2" />Saving…</> : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

const TABS = [
  { key: 'vehicles',     label: 'Vehicle Management', icon: 'fa-warehouse' },
  { key: 'customers',    label: 'Customer Management', icon: 'fa-users' },
  { key: 'income',       label: 'Income Management',    icon: 'fa-coins' },
  { key: 'invoicing',    label: 'Invoicing System',    icon: 'fa-file-invoice' },
  { key: 'inquiries',    label: 'Vehicle Inquiries',    icon: 'fa-envelope' },
  { key: 'admins',       label: 'Staff Management',    icon: 'fa-shield-alt',   adminOnly: true },
  { key: 'settings',     label: 'Account Settings',    icon: 'fa-user-cog' },
];

export default function AdminPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [active, setActive]   = useState(null);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [salesForm, setSalesForm] = useState({ full_name: '', email: '' });
  const [salesCreating, setSalesCreating] = useState(false);
  const [salesCreds, setSalesCreds] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'admin') { router.push('/'); return; }
    setChecked(true);
  }, [user, loading, router]);

  useEffect(() => {
    if (router.query.tab && TABS.some(t => t.key === router.query.tab)) {
      setActive(router.query.tab);
    }
  }, [router.query.tab]);

  const handleTabChange = (key) => {
    setActive(key);
    setSidebarOpen(false);
    router.replace({ query: { ...router.query, tab: key } }, undefined, { shallow: true });
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4500);
  };

  if (loading || !checked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <i className="fas fa-circle-notch animate-spin text-3xl text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin — Eljawad Motors Inc.</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="h-screen bg-gray-950 flex overflow-hidden">
        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/70 z-40 xl:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}>
          {/* Logo / brand */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-800 flex items-start justify-between">
            <div>
              <p className="font-bebas text-xl text-white tracking-wider">Eljawad Motors Inc.</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Admin Console</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="xl:hidden text-gray-500 hover:text-white transition mt-1">
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {TABS.filter(t => !t.adminOnly || user?.isPrimary).map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm font-bold transition text-left
                  ${active === tab.key
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <i className={`fas ${tab.icon} w-5 text-center`} />
                <span className="flex-1">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Admin user info */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-extrabold text-sm shrink-0">
                {(user?.name || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-2 w-full text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition">
              <i className="fas fa-arrow-left text-[9px]" /> Back to website
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 xl:ml-64">
          {/* Top bar */}
          <header className="bg-gray-900 border-b border-gray-800 px-4 md:px-8 py-4 flex items-center gap-4 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="xl:hidden text-gray-400 hover:text-white transition">
              <i className="fas fa-bars text-lg" />
            </button>
            <div className="flex-1">
              <h1 className="font-bebas text-xl text-[#1da1f2] tracking-wide leading-none">
                {active ? TABS.find(t => t.key === active)?.label : 'Admin Console'}
              </h1>
            </div>
            <button onClick={() => setShowSalesForm(true)} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-600 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
              <i className="fas fa-user-plus text-[10px]" /> Add Sales
            </button>
            {active && (
              <button
                onClick={() => { setActive(null); router.replace({ query: { tab: undefined } }, undefined, { shallow: true }); }}
                className="text-gray-400 hover:text-white transition p-1"
                title="Close panel">
                <i className="fas fa-times text-lg" />
              </button>
            )}
          </header>

          {/* Message toast */}
          {message && (
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-4 py-3 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-2xl min-w-[260px] max-w-[90vw] ${
              message.type === 'success'
                ? 'bg-green-900/90 border border-green-700 text-green-300'
                : 'bg-red-900/90 border border-red-700 text-red-300'
            }`}>
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} shrink-0`} />
              <span className="break-words">{message.text}</span>
            </div>
          )}

          {/* Content area */}
          <main className="flex-1 p-4 md:p-8 overflow-auto bg-gray-950">
            <div className="bg-white rounded-2xl min-h-[300px] sm:min-h-[500px] p-4 md:p-6">
              {!active && (
                <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] gap-4 sm:gap-6">
                  <div>
                    <p className="font-bebas text-3xl text-gray-800 tracking-wider text-center">Welcome back</p>
                    <p className="text-sm text-gray-400 text-center mt-1">Select a section to manage</p>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 w-full max-w-lg">
                    <button
                      onClick={() => handleTabChange('vehicles')}
                      className="flex flex-col items-center gap-2 sm:gap-3 p-4 xs:p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition group">
                      <i className="fas fa-warehouse text-2xl sm:text-3xl text-gray-400 group-hover:text-primary transition" />
                      <span className="font-bold text-gray-700 group-hover:text-primary transition text-xs sm:text-sm text-center">Vehicle Management</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('customers')}
                      className="flex flex-col items-center gap-2 sm:gap-3 p-4 xs:p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition group">
                      <i className="fas fa-users text-2xl sm:text-3xl text-gray-400 group-hover:text-primary transition" />
                      <span className="font-bold text-gray-700 group-hover:text-primary transition text-xs sm:text-sm text-center">Customer Management</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('income')}
                      className="flex flex-col items-center gap-2 sm:gap-3 p-4 xs:p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition group">
                      <i className="fas fa-coins text-2xl sm:text-3xl text-gray-400 group-hover:text-primary transition" />
                      <span className="font-bold text-gray-700 group-hover:text-primary transition text-xs sm:text-sm text-center">Income Management</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('invoicing')}
                      className="flex flex-col items-center gap-2 sm:gap-3 p-4 xs:p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition group">
                      <i className="fas fa-file-invoice text-2xl sm:text-3xl text-gray-400 group-hover:text-primary transition" />
                      <span className="font-bold text-gray-700 group-hover:text-primary transition text-xs sm:text-sm text-center">Invoicing System</span>
                    </button>
                    <button
                      onClick={() => handleTabChange('settings')}
                      className="flex flex-col items-center gap-2 sm:gap-3 p-4 xs:p-6 border-2 border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition group col-span-1 xs:col-span-2 sm:col-span-1">
                      <i className="fas fa-user-cog text-2xl sm:text-3xl text-gray-400 group-hover:text-primary transition" />
                      <span className="font-bold text-gray-700 group-hover:text-primary transition text-xs sm:text-sm text-center">Account Settings</span>
                    </button>
                  </div>
                </div>
              )}
              {active === 'vehicles'     && <CarManagement showMessage={showMessage} users={[]} userRole={user?.role} />}
              {active === 'customers'    && <CustomerList showMessage={showMessage} />}
              {active === 'income'       && <Deposits showMessage={showMessage} users={[]} />}
              {active === 'invoicing'    && <Invoices showMessage={showMessage} />}
              {active === 'inquiries'    && <Inquiries showMessage={showMessage} />}
              {active === 'admins'       && <AdminManagement showMessage={showMessage} />}
              {active === 'settings'     && <AdminSettings showMessage={showMessage} />}
            </div>
          </main>
        </div>
      </div>

      {/* Add Sales modal */}
      {showSalesForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { if (!salesCreating) setShowSalesForm(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Add Sales Account</h3>
            <p className="text-xs text-gray-400 mb-4">Sales staff can reserve vehicles, manage customers, and send invoices.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!salesForm.full_name.trim() || !salesForm.email.trim()) return;
              setSalesCreating(true);
              const res = await adminApiFetch('users/addUser.php', {
                method: 'POST',
                body: JSON.stringify({ action: 'create', role: 'sales', ...salesForm }),
              });
              setSalesCreating(false);
              if (res?.status === 'success') {
                setSalesCreds(res.credentials);
                setSalesForm({ full_name: '', email: '' });
                setShowSalesForm(false);
                showMessage('Sales account created', 'success');
              } else {
                showMessage(res?.message || 'Failed to create', 'error');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input type="text" required value={salesForm.full_name} onChange={e => setSalesForm(p => ({ ...p, full_name: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" required value={salesForm.email} onChange={e => setSalesForm(p => ({ ...p, email: e.target.value }))} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowSalesForm(false)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold text-sm rounded-lg py-2 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={salesCreating} className="flex-1 bg-primary text-white font-bold text-sm rounded-lg py-2 hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {salesCreating ? <><i className="fas fa-circle-notch animate-spin" /> Creating…</> : 'Create Sales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {salesCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSalesCreds(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Account Created</h3>
            <p className="text-xs text-gray-500 mb-4">Share these credentials with the new staff member:</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-4">
              <div><span className="text-[10px] font-bold text-gray-400 uppercase">Login URL</span><p className="text-sm font-mono bg-white border rounded px-2 py-1 mt-0.5">{typeof window !== 'undefined' ? window.location.origin : ''}/login</p></div>
              <div><span className="text-[10px] font-bold text-gray-400 uppercase">Email</span><p className="text-sm font-mono bg-white border rounded px-2 py-1 mt-0.5">{salesCreds.email}</p></div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Password</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="flex-1 block text-sm font-mono bg-white border rounded px-2 py-1">{salesCreds.password}</code>
                  <button onClick={() => { navigator.clipboard.writeText(salesCreds.password); showMessage('Password copied', 'success'); }} className="text-primary hover:text-primary/80 text-xs font-bold whitespace-nowrap"><i className="fas fa-copy mr-1" />Copy</button>
                </div>
              </div>
            </div>
            <button onClick={() => setSalesCreds(null)} className="w-full bg-primary text-white font-bold text-sm rounded-lg py-2 hover:bg-primary/90 transition">Done</button>
          </div>
        </div>
      )}
    </>
  );
}

// Skip the public website Layout entirely
AdminPage.getLayout = (page) => page;

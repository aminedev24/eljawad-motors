import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
const NAVY = '#1e3a8a';
const SKY = '#1da1f2';
const ORANGE = '#f1892b';
import { adminApiFetch } from './adminApi';
import { formatNumberWithUnit } from '../utilities/numberFormat';
import { fetchAllMakesModels, getMakesData, titleCaseMake } from '../vehicles/vehicleData';
import CustomerManagement from './CustomerManagement';
import Pagination from './Pagination';
import Reservations from './Reservations';
import SoldCars from './SoldCars';

// Prefix for own-stock reference numbers (ELJ-0001, ...). Must match
// STOCK_REF_PREFIX in server/inventory/cars/vehicle-action.php.
const STOCK_REF_PREFIX = 'ELJ-';

const statusBadgeClass = (s) => {
  if (s === 'in_stock') return 'bg-green-50 text-green-700';
  if (s === 'reserved') return 'bg-amber-50 text-amber-700';
  if (s && s.toLowerCase().startsWith('sold')) return 'bg-red-50 text-red-700';
  if (s && s.toLowerCase() === 'pending') return 'bg-blue-50 text-blue-700';
  if (s) return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-500';
};

const statusLabel = (s) => {
  if (s === 'in_stock') return 'Stock';
  if (s === 'reserved') return 'Reserved';
  if (s === 'sold_shipping') return 'Shipping';
  if (s === 'sold_by_owner') return 'By Owner';
  if (s === 'sold_locally') return 'Local';
  return s || 'No Status';
};

const isAvailableStatus = (s) => !s || ['in_stock', 'available', 'pending'].includes(String(s).toLowerCase());

// Partner/3rd-party stock (company 'ichinomiya_import') is priced in USD even
// when the feed row mislabels currency as "JPY". Own cars keep their currency.
const displayCurrency = (v) =>
  String(v?.company || '').toLowerCase() === 'ichinomiya_import' ? 'USD' : (v?.currency || 'USD');

const EQUIPMENT_LIST = [
  'Air Bag','Anti-lock Brakes','Air Conditioner','Alloy Wheels','Power Window',
  'Power Steering','Power Seat','Power Slide Door','HID Light','Fog Light',
  'LED Light','Push Start','Steering Switch','Back Monitor','Sun Roof',
  'Glass Roof','Roof Rail','Leather Seat','Seat Heater','Back Tyre',
  'Grill Guard','Side Step','Aero Parts','Rear Spoiler','Navigation System',
];

function InlineCustomerPicker({ users, onSelect, onAddNew }) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const inputRef            = useRef(null);
  const containerRef        = useRef(null);

  const allCustomers = users.filter(u => u.role === 'customer')
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  const filtered = query.trim().length === 0
    ? allCustomers.slice(0, 20)
    : allCustomers.filter(u =>
        u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        u.email?.toLowerCase().includes(query.toLowerCase()) ||
        u.phone?.includes(query)
      ).slice(0, 20);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Type name, email or phone…"
          className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary"
        />
      </div>
      {open && (
        <div className="absolute z-[90] left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-y-auto max-h-52">
            {filtered.length === 0
              ? <p className="text-center py-4 text-gray-400 text-sm">No customers found</p>
              : filtered.map(u => (
                <button key={u.id}
                  onMouseDown={e => { e.preventDefault(); onSelect(u); setQuery(''); setOpen(false); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-primary/5 border-b border-gray-100 last:border-0 transition flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold text-xs shrink-0">
                    {(u.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 text-sm truncate">{u.full_name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}{u.country ? ` · ${u.country}` : ''}</p>
                  </div>
                </button>
              ))
            }
          </div>
          <button
            onMouseDown={e => { e.preventDefault(); setOpen(false); onAddNew(); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 border-t-2 border-gray-100 transition">
            <i className="fas fa-user-plus text-xs" /> Add New Customer
          </button>
        </div>
      )}
    </div>
  );
}

export default function CarManagement({ showMessage, users: propUsers = [], userRole }) {
  const isSales = userRole === 'sales';

  // fetchVehicle.php returns options as a JSON array string (matching the
  // partner feed), while the form holds a real array. Normalize both.
  const parseOptionsArray = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; } catch {}
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const [subView, setSubView] = useState('inventory');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [makesModels, setMakesModels] = useState({});
  const [users, setUsers] = useState(propUsers);
  const [form, setForm] = useState({
    ref_no: '', supplier_ref: '', make: '', model: '', year: '', price: '', currency: 'USD',
    mileage: '', engine_capacity: '', transmission: '', fuel: '', color: '',
    doors: '', seats: '', drive: '', chassis_no: '', dimension: '', m3: '',
    category: '', grade: '', model_code: '', location: '', steering: '', image_urls: '', description: '', options: [], status: 'in_stock',
    buyer_name: '', buyer_email: '', buyer_phone: '', buyer_country: ''
  });
  const [refLoading, setRefLoading] = useState(false);
  const [supplierRefInput, setSupplierRefInput] = useState('');

  const [importingSupplier, setImportingSupplier] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [formSaving, setFormSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [actionLoading, setActionLoading] = useState(null);
  const [soldModal, setSoldModal] = useState(null);
  const [reserveModal, setReserveModal] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [buyerSuggestions, setBuyerSuggestions] = useState([]);
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(null);
  const [reserveDuration, setReserveDuration] = useState(48);
  const [statusFilter, setStatusFilter] = useState('');
  const [makeFilter, setMakeFilter] = useState('');
  const [filterMakeOptions, setFilterMakeOptions] = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [filterYearOptions, setFilterYearOptions] = useState([]);
  const [addedByFilter, setAddedByFilter] = useState('');
  const [staffUsers, setStaffUsers] = useState([]);
  const [showMakesModels, setShowMakesModels] = useState(false);
  const [mmNewMake, setMmNewMake] = useState('');
  const [mmNewModel, setMmNewModel] = useState('');
  const [mmSaving, setMmSaving] = useState(false);
  const [mmItems, setMmItems] = useState([]);
  const [mmLoading, setMmLoading] = useState(false);
  const [mmEditing, setMmEditing] = useState(null);
  const [mmEditMake, setMmEditMake] = useState('');

  const totalPages = Math.ceil(vehicles.length / itemsPerPage);
  const pagedVehicles = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return vehicles.slice(start, start + itemsPerPage);
  }, [vehicles, page, itemsPerPage]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    const max = Math.max(1, Math.ceil(vehicles.length / itemsPerPage));
    if (page > max) setPage(max);
  }, [vehicles.length, itemsPerPage, page]);

  const fetchVehicles = useCallback(async (q, sf, mf, yf, abf, view) => {
    setLoading(true);
    const isThirdParty = view === '3rdParty';
    const result = await adminApiFetch(isThirdParty ? 'inventory/cars/fetchStock.php' : 'inventory/cars/fetchAdminStock.php');
    let list = Array.isArray(result) ? result : [];
    if (q) { const s = q.toLowerCase(); list = list.filter(v => (v.ref_no||'').toLowerCase().includes(s) || (v.make||'').toLowerCase().includes(s) || (v.model||'').toLowerCase().includes(s) || (v.chassis_no||'').toLowerCase().includes(s)); }
    if (sf) list = list.filter(v => v.status === sf);
    if (mf) list = list.filter(v => v.make === mf);
    if (yf) list = list.filter(v => String(v.year) === yf);
    if (abf) list = list.filter(v => String(v.created_by) === abf);
    setVehicles(list);
    const makes = [...new Set(list.map(v => v.make).filter(Boolean))].sort();
    setFilterMakeOptions([...new Set([...makes, ...getMakesData()].filter(Boolean))].sort());
    const years = [...new Set(list.map(v => v.year).filter(Boolean))].sort((a, b) => String(b).localeCompare(String(a)));
    setFilterYearOptions(years);
    const addedUsers = [...new Set(list.map(v => v.created_by).filter(Boolean))];
    setStaffUsers(addedUsers.map((id) => {
      const row = list.find(v => v.created_by === id);
      return { id, full_name: row?.created_by_name || '—' };
    }));
    setLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    const result = await adminApiFetch('users/getUsers.php');
    if (result?.status === 'success') setUsers(result.data || []);
  }, []);

  const buildMmItems = (mm) =>
    Object.keys(mm)
      .sort()
      .map((m, i) => ({ id: i + 1, make: m, count: (mm[m] || []).length }));

  const fetchCustomMakesModels = useCallback(async () => {
    setMmLoading(true);
    setMmItems(buildMmItems(makesModels));
    setMmLoading(false);
  }, [makesModels]);

  const handleAddMakeModel = () => {
    const make = mmNewMake.trim().toUpperCase();
    if (!make) return;
    setMmSaving(true);
    setTimeout(() => {
      const next = { ...makesModels };
      if (!next[make]) next[make] = [];
      const model = mmNewModel.trim().toUpperCase();
      if (model && !next[make].includes(model)) next[make].push(model);
      setMakesModels(next);
      setMmItems(buildMmItems(next));
      setMmSaving(false);
      setMmNewMake('');
      setMmNewModel('');
      showMessage('Added', 'success');
    }, 300);
  };

  const handleDeleteMakeModel = (id) => {
    const target = mmItems.find(i => i.id === id);
    if (target) {
      const next = { ...makesModels };
      delete next[target.make];
      setMakesModels(next);
      setMmItems(buildMmItems(next));
      showMessage('Deleted', 'success');
    }
  };

  const handleEditMakeModel = (item) => {
    setMmEditing(item.id);
    setMmEditMake(item.make);
  };

  const handleSaveMakeModel = () => {
    if (!mmEditMake.trim()) return;
    setMmSaving(true);
    setTimeout(() => {
      const target = mmItems.find(i => i.id === mmEditing);
      const newName = mmEditMake.trim().toUpperCase();
      const next = { ...makesModels };
      if (target && target.make !== newName) {
        if (next[newName]) next[newName] = [...next[newName], ...(next[target.make] || [])];
        else next[newName] = next[target.make] || [];
        delete next[target.make];
      }
      setMakesModels(next);
      setMmItems(buildMmItems(next));
      setMmSaving(false);
      setMmEditing(null);
      showMessage('Updated', 'success');
    }, 300);
  };

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView); }, [subView, statusFilter, makeFilter, yearFilter, addedByFilter, fetchVehicles]);

  useEffect(() => { setSelectedIds(new Set()); }, [subView]);
  useEffect(() => { if (propUsers.length === 0) fetchUsers(); }, [propUsers, fetchUsers]);

  useEffect(() => {
    const fetchBuyers = async () => {
      const result = await adminApiFetch('users/getUsers.php');
      if (result?.status === 'success') setBuyers(result.data.filter(u => u.role === 'customer') || []);
    };
    fetchBuyers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [stock, unified] = await Promise.all([
        adminApiFetch('inventory/cars/fetchStock.php').then(r => (Array.isArray(r) ? r : [])).catch(() => []),
        fetchAllMakesModels().catch(() => ({})),
      ]);
      if (cancelled) return;
      const mm = {};
      Object.keys(unified).forEach(m => { mm[m] = [...(unified[m] || [])]; });
      stock.forEach(v => {
        if (v.make) {
          if (!mm[v.make]) mm[v.make] = [];
          if (v.model && !mm[v.make].includes(v.model)) mm[v.make].push(v.model);
        }
      });
      setMakesModels(mm);
      setFilterMakeOptions(prev => [...new Set([...prev, ...Object.keys(mm)].filter(Boolean))].sort());
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const photoFilesRef = useRef([]);
  useEffect(() => { photoFilesRef.current = photoFiles; }, [photoFiles]);
  useEffect(() => () => photoFilesRef.current.forEach(pf => URL.revokeObjectURL(pf.preview)), []);

  const handleSearch = (e) => { e.preventDefault(); fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView); };

  const openCreate = async () => {
    setEditItem(null);
    setSupplierRefInput('');
    setForm({ ref_no: '', supplier_ref: '', make: '', model: '', year: '', price: '', currency: 'USD', mileage: '', engine_capacity: '', transmission: '', fuel: '', color: '', doors: '', seats: '', drive: '', chassis_no: '', dimension: '', m3: '', category: '', grade: '', model_code: '', location: '', steering: '', image_urls: '', description: '', options: [], status: 'in_stock', buyer_name: '', buyer_email: '', buyer_phone: '', buyer_country: '' });
    setPhotoFiles([]);
    setShowForm(true);
    setRefLoading(true);
    const stock = await adminApiFetch('inventory/cars/fetchAdminStock.php');
    const nextNum = (Array.isArray(stock) ? Math.max(0, ...stock.map(v => parseInt(v.ref_no?.replace(/\D/g, ''))||0)) : 0) + 1;
    setRefLoading(false);
    setForm(p => ({ ...p, ref_no: `${STOCK_REF_PREFIX}${String(nextNum).padStart(4, '0')}` }));
  };

  const importFromSupplier = async (refOverride = supplierRefInput) => {
    const ref = (refOverride || supplierRefInput || '').trim();
    if (!ref) return;
    setImportingSupplier(true);
    try {
      const data = await adminApiFetch('inventory/cars/fetchVehicle.php', { query: `id=${encodeURIComponent(ref)}` });
      if (!data || data.error) {
        showMessage(`Vehicle not found in supplier stock. Check the ref number.`, 'error');
        setImportingSupplier(false);
        return;
      }

      const fuelRaw = (data.fuel || '').toLowerCase();
      const fuelMap = { gasoline: 'Petrol', petrol: 'Petrol', diesel: 'Diesel', hybrid: 'Hybrid', electric: 'Electric', ev: 'Electric', phev: 'Hybrid', 'plug-in hybrid': 'Hybrid' };
      const normalizedFuel = fuelMap[fuelRaw] || data.fuel || '';

      const transRaw = (data.transmission || data.trans || '').toUpperCase();
      const normalizedTrans = transRaw === 'AT' || transRaw === 'CVT' ? 'Automatic'
        : transRaw === 'MT' ? 'Manual'
        : data.transmission || data.trans || '';

      const steeringVal = (data.steering || '').includes('Right') ? 'RHD'
        : (data.steering || '').includes('Left') ? 'LHD' : 'RHD';

      const rawImages = data.image_urls;
      let images = [];
      if (Array.isArray(rawImages)) images = rawImages;
      else if (typeof rawImages === 'string' && rawImages.trim()) {
        const trimmed = rawImages.trim();
        if (trimmed.startsWith('[')) { try { const parsed = JSON.parse(trimmed); if (Array.isArray(parsed)) images = parsed; } catch {} }
        if (images.length === 0) images = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }

      setForm(p => ({
        ...p,
        ref_no:          ref,
        make:            data.make                               || p.make,
        model:           data.model                              || p.model,
        year:            data.year                               || p.year,
        price:           data.price != null ? String(data.price) : p.price,
        currency:        data.currency                           || 'USD',
        mileage:         data.mileage != null ? String(data.mileage) : p.mileage,
        engine_capacity: data.engine_capacity                    || p.engine_capacity,
        transmission:    normalizedTrans                         || p.transmission,
        fuel:            normalizedFuel                          || p.fuel,
        color:           data.color                              || p.color,
        chassis_no:      data.chassis_no                         || p.chassis_no,
        doors:           data.door != null ? String(data.door) : p.doors,
        seats:           data.seat != null ? String(data.seat) : p.seats,
        drive:           data.drive                              || p.drive,
        steering:        steeringVal,
        category:        data.category                           || p.category,
        grade:           data.grade                              || p.grade,
        model_code:      data.model_code                         || p.model_code,
        location:        data.location                           || p.location,
        image_urls:      images.join(','),
        options:         parseOptionsArray(data.options),
        supplier_ref:    ref,
      }));
      showMessage(`Imported: ${data.make || ''} ${data.model || ref} — review and save.`, 'success');
    } catch {
      showMessage('Failed to fetch vehicle data.', 'error');
    }
    setImportingSupplier(false);
  };

  const handleImportThirdParty = async (v) => {
    setImportingSupplier(true);
    try {
      const data = await adminApiFetch('inventory/cars/fetchVehicle.php', { query: `id=${encodeURIComponent(v.ref_no || v.id)}` });
      if (!data || data.error) {
        showMessage('Vehicle not found in supplier stock.', 'error');
        return;
      }
      const stock = await adminApiFetch('inventory/cars/fetchAdminStock.php');
      const nextNum = (Array.isArray(stock) ? Math.max(0, ...stock.map(s => parseInt(s.ref_no?.replace(/\D/g, '')) || 0)) : 0) + 1;
      const newRef = `${STOCK_REF_PREFIX}${String(nextNum).padStart(4, '0')}`;

      const rawImages = data.image_urls;
      let images = [];
      if (Array.isArray(rawImages)) images = rawImages;
      else if (typeof rawImages === 'string' && rawImages.trim()) {
        const trimmed = rawImages.trim();
        if (trimmed.startsWith('[')) { try { const parsed = JSON.parse(trimmed); if (Array.isArray(parsed)) images = parsed; } catch {} }
        if (images.length === 0) images = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }

      const result = await adminApiFetch('inventory/cars/submit_car.php', {
        method: 'POST',
        body: {
          action: 'create',
          refNo: newRef,
          make: data.make || '',
          model: data.model || '',
          year: data.year || '',
          price: data.price || '',
          currency: displayCurrency(data),
          mileage: data.mileage || '',
          engineCapacity: data.engine_capacity || '',
          transmission: data.transmission || '',
          fuel: data.fuel || '',
          color: data.color || '',
          chassisNo: data.chassis_no || '',
          door: data.door || '',
          seat: data.seat || '',
          drive: data.drive || '',
          category: data.category || '',
          dimension: data.dimension || '',
          m3: data.m3 || '',
          image_urls: images.join(','),
          options: parseOptionsArray(data.options),
          steering: data.steering || '',
          model_code: data.model_code || '',
          status: 'in_stock',
          targetTable: 'cars_stock',
        }
      });
      if (result?.status === 'success' || result?.message) {
        showMessage(`Imported ${data.make || ''} ${data.model || ''} to inventory (${newRef})`, 'success');
        fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView);
      } else {
        showMessage(result?.message || result?.error || 'Import failed', 'error');
      }
    } catch {
      showMessage('Failed to import vehicle.', 'error');
    }
    setImportingSupplier(false);
  };

  const handleIssueInvoice = (v) => {
    const normalizeAmount = (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return "";
      const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
      return Number.isFinite(numeric) ? numeric : "";
    };
    const invoiceData = {
      make:                v.make            || '',
      model:               v.model           || '',
      vehicle_ref:         v.ref_no          || '',
      chasis_number:       v.chassis_no      || '',
      engine_capacity:     v.engine_capacity || '',
      mileage:             v.mileage         || '',
      vehicle_description: [v.year, v.make, v.model].filter(Boolean).join(' '),
      deposit_amount:      normalizeAmount(v.price),
      deposit_currency:    v.currency || 'USD',
      deposit_purpose:     'Paying My Vehicle',
      description:         `Payment for ${[v.make, v.model].filter(Boolean).join(' ')}${v.ref_no ? ` (Ref: ${v.ref_no})` : ''}`,
      customer_name:       v.buyer_name    || '',
      email:               v.buyer_email   || '',
      phone:               v.buyer_phone   || '',
      country:             v.buyer_country || '',
      company:             v.company       || '',
      address:             v.address       || '',
    };
    const payloadString = JSON.stringify(invoiceData);
    try { sessionStorage.setItem('invoiceData', payloadString); } catch {}
    try { localStorage.setItem('invoiceData', payloadString); } catch {}
    window.open('/invoice-generator', '_blank', 'noopener,noreferrer');
  };

  const openEdit = (v) => {
    setEditItem(v);
    setForm({ ref_no: v.ref_no || '', supplier_ref: v.supplier_ref || '', make: v.make || '', model: v.model || '', year: v.year || '', price: v.price || '', currency: v.currency || 'USD', mileage: v.mileage || '', engine_capacity: v.engine_capacity || '', transmission: v.transmission || '', fuel: v.fuel || '', color: v.color || '', doors: v.doors || '', seats: v.seats || '', drive: v.drive || '', chassis_no: v.chassis_no || '', dimension: v.dimension || '', m3: v.m3 || '', category: v.category || '', grade: v.grade || '', model_code: v.model_code || '', location: v.location || '', steering: v.steering || '', image_urls: v.image_urls || '', description: v.description || '', options: Array.isArray(v.options) ? v.options : [], status: v.status || 'in_stock', buyer_name: v.buyer_name || '', buyer_email: v.buyer_email || '', buyer_phone: v.buyer_phone || '', buyer_country: v.buyer_country || '' });
    setPhotoFiles([]);
    setShowForm(true);
  };

  const publishStock = useCallback(async () => {
    // No publish endpoint in artisbay — no-op
  }, [showMessage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formSaving) return;
    setFormSaving(true);
    let finalImageUrls = form.image_urls;

    if (photoFiles.length > 0) {
      setPhotoUploading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/artisbay-inc/server';
      const existingCount = form.image_urls ? form.image_urls.split(',').map(s => s.trim()).filter(Boolean).length : 0;
      for (let i = 0; i < photoFiles.length; i++) {
        const fd = new FormData();
        fd.append('images', photoFiles[i].file);
        fd.append('refNo', form.ref_no);
        fd.append('make', form.make);
        fd.append('model', form.model);
        fd.append('index', existingCount + i);
        fd.append('status', form.status);
        try {
          const uploadUrl = `${apiBase}/inventory/cars/upload_car_images.php`;
          const res = await fetch(uploadUrl, {
            method: 'POST', credentials: 'include',
            body: fd,
          });
          const text = await res.text();
          let data;
          try { data = JSON.parse(text); } catch { data = { error: 'Invalid JSON: ' + text.substring(0,100) }; }
          if (data.url || data.image_url) {
            const url = data.url || data.image_url;
            finalImageUrls = finalImageUrls ? `${finalImageUrls},${url}` : url;
          } else {
            const errMsg = data.error || 'Photo upload failed (no URL in response)';
            showMessage(errMsg, 'error');
            setPhotoUploading(false);
            return;
          }
        } catch (err) {
          showMessage('Photo upload failed', 'error');
          setPhotoUploading(false);
          return;
        }
      }
      setPhotoUploading(false);
      photoFiles.forEach(pf => URL.revokeObjectURL(pf.preview));
      setPhotoFiles([]);
    }

    const result = await adminApiFetch(editItem ? 'inventory/cars/saveCars.php' : 'inventory/cars/submit_car.php', {
      method: 'POST',
      body: {
        action: editItem ? 'update' : 'create',
        id: editItem?.id,
        refNo: form.ref_no,
        make: form.make,
        model: form.model,
        year: form.year,
        price: form.price,
        currency: form.currency,
        mileage: form.mileage,
        engineCapacity: form.engine_capacity,
        transmission: form.transmission,
        fuel: form.fuel,
        color: form.color,
        chassisNo: form.chassis_no,
        door: form.doors,
        seat: form.seats,
        drive: form.drive,
        steering: form.steering,
        grade: form.grade,
        model_code: form.model_code,
        location: form.location,
        category: form.category,
        dimension: form.dimension,
        m3: form.m3,
        description: form.description,
        image_urls: finalImageUrls,
        options: form.options,
        status: form.status,
        buyer_name: form.buyer_name,
        buyer_email: form.buyer_email,
        buyer_phone: form.buyer_phone,
        buyer_country: form.buyer_country,
        targetTable: 'cars_stock',
      }
    });
    if (result?.status === 'success' || result?.message) {
      showMessage(result.message || (editItem ? 'Vehicle updated' : 'Vehicle created'), 'success');
      setShowForm(false);
      fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView);
      publishStock();
    } else {
      showMessage(result?.message || 'Failed to save', 'error');
    }
    setFormSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    const result = await adminApiFetch('inventory/cars/submit_car.php', {
      method: 'POST', body: { action: 'delete', id }
    });
    if (result?.status === 'success') { showMessage('Vehicle deleted', 'success'); setSelectedIds(new Set()); fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView); publishStock(); }
    else showMessage(result?.message || 'Delete failed', 'error');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const pageIds = pagedVehicles.map(v => v.id);
      const allSelected = pageIds.length > 0 && pageIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected vehicle(s)? This cannot be undone.`)) return;
    const result = await adminApiFetch('inventory/cars/submit_car.php', {
      method: 'POST', body: { action: 'delete', ids: Array.from(selectedIds) }
    });
    if (result?.status === 'success') {
      showMessage(result.message || 'Vehicles deleted', 'success');
      setSelectedIds(new Set());
      fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView);
      publishStock();
    } else {
      showMessage(result?.message || 'Delete failed', 'error');
    }
  };

  const handleVehicleAction = async (vehicleRef, action, saleType, buyerDetails, durationHours, vehicleData) => {
    setActionLoading(vehicleRef);
    try {
      const body = { action, vehicle_ref: vehicleRef };
      if (action === 'mark_sold' && saleType) body.sale_type = saleType;
      if (action === 'reserve' && durationHours) body.duration_hours = durationHours;
      if (buyerDetails) {
        if (buyerDetails.buyer_name) body.buyer_name = buyerDetails.buyer_name;
        if (buyerDetails.buyer_email) body.buyer_email = buyerDetails.buyer_email;
        if (buyerDetails.buyer_phone) body.buyer_phone = buyerDetails.buyer_phone;
        if (buyerDetails.buyer_country) body.buyer_country = buyerDetails.buyer_country;
      }
      if (vehicleData) body.vehicle = vehicleData;
      const result = await adminApiFetch('inventory/cars/vehicle-action.php', { method: 'POST', body });
      if (result?.status === 'success' || result?.success) {
        showMessage(result.message || 'Action completed', 'success');
        fetchVehicles(search, statusFilter, makeFilter, yearFilter, addedByFilter, subView);
        publishStock();
      } else {
        showMessage(result?.message || result?.error || 'Action failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    }
    setActionLoading(null);
    setSoldModal(null);
    setReserveModal(null);
  };

  const filterBuyers = (query, modalType) => {
    if (!query || query.length < 1) {
      setBuyerSuggestions(buyers.slice(0, 12));
      setShowBuyerSuggestions(modalType);
      return;
    }
    const q = query.toLowerCase();
    const matches = buyers.filter(b =>
      (b.full_name || '').toLowerCase().includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.phone || '').toLowerCase().includes(q)
    ).slice(0, 8);
    setBuyerSuggestions(matches);
    setShowBuyerSuggestions(modalType);
  };

  const selectBuyer = (buyer, modalType) => {
    if (modalType === 'form') {
      setForm(p => ({
        ...p,
        buyer_name: buyer.full_name || '',
        buyer_email: buyer.email || '',
        buyer_phone: buyer.phone || '',
        buyer_country: buyer.country || '',
      }));
    } else {
      const prefix = modalType === 'reserve' ? 'reserve' : 'sold';
      document.getElementById(`${prefix}BuyerName`).value = buyer.full_name || '';
      document.getElementById(`${prefix}BuyerEmail`).value = buyer.email || '';
      document.getElementById(`${prefix}BuyerPhone`).value = buyer.phone || '';
      document.getElementById(`${prefix}BuyerCountry`).value = buyer.country || '';
    }
    setBuyerSuggestions([]);
    setShowBuyerSuggestions(null);
  };

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const toggleOption = (item) => setForm(p => ({
    ...p,
    options: p.options.includes(item) ? p.options.filter(o => o !== item) : [...p.options, item]
  }));

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotoFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    const existingUrls = form.image_urls ? form.image_urls.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (idx < existingUrls.length) {
      const urls = existingUrls.filter((_, i) => i !== idx);
      setForm(p => ({ ...p, image_urls: urls.join(',') }));
    } else {
      const fileIdx = idx - existingUrls.length;
      setPhotoFiles(prev => {
        URL.revokeObjectURL(prev[fileIdx].preview);
        return prev.filter((_, i) => i !== fileIdx);
      });
    }
  };

  return (
    <div className="space-y-0">
{/* Sub-view toggle */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full">
        {[isSales ? null : ['inventory','Inventory','fa-warehouse'], ['3rdParty','3rd Party','fa-handshake'], ['reservations','Reservations','fa-calendar-check'], ['sold','Sold','fa-check-circle']].filter(Boolean).map(([key,label,icon]) => (
          <button key={key} onClick={() => setSubView(key)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition whitespace-nowrap shrink-0 ${
              subView === key
                ? 'text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={subView === key ? { backgroundColor: NAVY } : {}}>
            <i className={`fas ${icon} text-sm`} /> {label}
          </button>
        ))}
      </div>

      {subView === 'reservations' && <Reservations showMessage={showMessage} users={users} />}
      {subView === 'sold' && <SoldCars showMessage={showMessage} users={users} />}

{(subView === 'inventory' || subView === '3rdParty') && <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
          <h3 className="font-bebas text-xl md:text-2xl tracking-wide" style={{ color: NAVY }}>{subView === '3rdParty' ? '3rd Party Vehicles' : 'Vehicle Management'}</h3>
          <div className="flex gap-2 flex-wrap">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2 text-sm focus:outline-none w-32 md:w-48" style={{ focusBorderColor: NAVY }} />
              <button type="submit" className="text-white px-3 md:px-4 rounded-lg hover:opacity-90 transition" style={{ backgroundColor: NAVY }}><i className="fas fa-search text-base" /></button>
            </form>
            {!isSales && subView !== '3rdParty' && <button onClick={openCreate} style={{ backgroundColor: ORANGE }} className="text-white px-3 md:px-4 py-2 rounded-lg text-xs font-bold uppercase hover:opacity-90 transition flex items-center gap-1"><i className="fas fa-plus text-sm" /> Add</button>}
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
              style={{ borderColor: '#d1d5db' }}
            >
              <option value={10}>10/p</option>
              <option value={20}>20/p</option>
              <option value={50}>50/p</option>
              <option value={100}>100/p</option>
            </select>
          </div>
        </div>
        {/* Status + Make filter row */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mr-1">Filters:</span>
          {subView === 'inventory' && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: '#d1d5db' }}
          >
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="sold_shipping">Sold — Shipping</option>
            <option value="sold_by_owner">Sold by Owner</option>
            <option value="sold_locally">Sold Locally</option>
          </select>
          )}
          <select
            value={makeFilter}
            onChange={(e) => { setMakeFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: '#d1d5db' }}
          >
            <option value="">All Makes</option>
            {filterMakeOptions.map(m => <option key={m} value={m}>{titleCaseMake(m)}</option>)}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: '#d1d5db' }}
          >
            <option value="">All Years</option>
            {filterYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {subView === 'inventory' && (
          <select
            value={addedByFilter}
            onChange={(e) => { setAddedByFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: '#d1d5db' }}
          >
            <option value="">All Added By</option>
            {staffUsers.map((u, i) => <option key={i} value={u.id}>{u.full_name}</option>)}
          </select>
          )}
          {(statusFilter || makeFilter || yearFilter || addedByFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setMakeFilter(''); setYearFilter(''); setAddedByFilter(''); setPage(1); }}
              style={{ color: '#dc2626' }}
              className="text-[10px] font-bold hover:text-red-700 flex items-center gap-1 px-2 py-1.5"
            >
              <i className="fas fa-times" /> Clear
            </button>
          )}
          {subView === 'inventory' && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="text-[10px] font-bold flex items-center gap-1 px-2 py-1.5 rounded border"
              style={{ color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
            >
              <i className="fas fa-trash-alt text-[10px]" /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
{/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 shrink-0" style={{ backgroundColor: NAVY }}>
              <h3 className="font-bebas text-xl text-white">{editItem ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white p-1" title="Close"><i className="fas fa-times text-lg" /></button>
            </div>
            {/* Scrollable fields */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-5 py-4">
{/* Import panel — only shown when adding a new vehicle */}
                {!editItem && (
                  <div className="mb-5 p-4 rounded-xl space-y-3" style={{ backgroundColor: '#f0f7ff', borderColor: SKY, borderWidth: 2 }}>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: SKY }}>
                      <i className="fas fa-file-import mr-1" /> Import Vehicle Data
                    </p>
                    {/* Ref input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={supplierRefInput}
                        onChange={e => setSupplierRefInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), importFromSupplier())}
                        placeholder="Enter supplier ref number…"
                        className="flex-1 border-2 rounded-lg px-3 py-2 text-sm focus:outline-none font-mono bg-white"
                        style={{ borderColor: SKY }}
                      />
                      <button
                        type="button"
                        onClick={() => importFromSupplier()}
                        disabled={importingSupplier || !supplierRefInput.trim()}
                        className="text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2 shrink-0"
                        style={{ backgroundColor: SKY }}
                      >
                        {importingSupplier ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-search" />}
                        {importingSupplier ? 'Loading…' : 'Import'}
                      </button>
                    </div>
                    <p className="text-[10px]" style={{ color: '#60a5fa' }}>
                      Fetches vehicle details from the supplier feed and pre-fills the form.
                      You can edit any field before saving.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ref — auto-generated ref */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">
                      Ref No
                    </label>
                    <div className="relative">
                      <input name="ref_no" value={form.ref_no} onChange={handleChange}
                        readOnly={refLoading}
                        className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400 text-gray-700 bg-white" />
                      {!editItem && refLoading && (
                        <i className="fas fa-spinner animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 text-xs" />
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">
                      Supplier Ref
                    </label>
                    <input name="supplier_ref" value={form.supplier_ref} onChange={handleChange}
                      placeholder="Original supplier ref"
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary text-gray-700 bg-white" />
                  </div>
                  <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Make *</label><select name="make" value={form.make} onChange={e => { setForm(p => ({ ...p, make: e.target.value, model: '' })); }} required className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="">Select Make</option>{Object.keys(makesModels).sort().map(m => <option key={m} value={m}>{titleCaseMake(m)}</option>)}</select></div>
                  <div className="col-span-2 sm:col-span-1"><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Model *</label><select name="model" value={form.model} onChange={handleChange} required className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="">Select Model</option>{(() => { const opts = form.make ? (makesModels[form.make] || []).sort() : Object.values(makesModels).reduce((a, b) => a.concat(b), []).sort(); const extra = form.model && !opts.includes(form.model); return (<>{extra && <option key="__imported__" value={form.model}>{form.model} (imported)</option>}{opts.map(m => <option key={m} value={m}>{m}</option>)}</>); })()}</select></div>
                  <div className="col-span-2"><button type="button" onClick={() => { setShowMakesModels(true); fetchCustomMakesModels(); }} className="text-[10px] font-bold text-primary hover:text-primary/80 underline"><i className="fas fa-cog mr-1" />Manage Makes &amp; Models</button></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Year</label><input name="year" value={form.year} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Price</label><input name="price" value={form.price} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Currency</label><select name="currency" value={form.currency} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="USD">USD</option><option value="JPY">JPY</option><option value="EUR">EUR</option></select></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Mileage</label><input name="mileage" value={form.mileage} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Engine</label><input name="engine_capacity" value={form.engine_capacity} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Transmission</label><select name="transmission" value={form.transmission} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="">Select</option><option value="Automatic">Automatic</option><option value="Manual">Manual</option></select></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Fuel</label><select name="fuel" value={form.fuel} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="">Select</option><option value="Petrol">Petrol</option><option value="Diesel">Diesel</option><option value="Hybrid">Hybrid</option><option value="Electric">Electric</option></select></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Color</label><input name="color" value={form.color} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Chassis No</label><input name="chassis_no" value={form.chassis_no} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Doors</label><input name="doors" value={form.doors} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Seats</label><input name="seats" value={form.seats} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Drive</label><select name="drive" value={form.drive} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="">Select</option><option value="2WD">2WD</option><option value="4WD">4WD</option><option value="AWD">AWD</option></select></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Steering</label><select name="steering" value={form.steering} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"><option value="">Select</option><option value="RHD">RHD</option><option value="LHD">LHD</option></select></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Grade</label><input name="grade" value={form.grade} onChange={handleChange} placeholder="e.g. G, X, Z" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Model Code</label><input name="model_code" value={form.model_code} onChange={handleChange} placeholder="e.g. ZVW30" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Location</label><input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Aichi, Japan" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                  <div><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                      <option value="in_stock">In Stock</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                      <option value="sold_shipping">Sold — Shipping</option>
                      <option value="sold_by_owner">Sold by Owner</option>
                      <option value="sold_locally">Sold Locally</option>
                    </select>
                  </div>

                  {(form.status === 'reserved' || form.status?.startsWith('sold')) && (
                    <div className="col-span-2 border-t border-gray-200 pt-4 relative">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-2">Buyer Details <span className="text-gray-300 normal-case">(optional)</span></p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="relative">
                          <input name="buyer_name" value={form.buyer_name} onChange={handleChange} placeholder="Buyer name"
                            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            onFocus={() => filterBuyers(form.buyer_name, 'form')}
                            onBlur={() => setTimeout(() => setShowBuyerSuggestions(null), 200)} />
                          {showBuyerSuggestions === 'form' && buyerSuggestions.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                              {buyerSuggestions.map((b, i) => (
                                <button key={i} type="button" onMouseDown={() => selectBuyer(b, 'form')}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition border-b border-gray-50 last:border-0">
                                  <div className="font-medium text-gray-900">{b.full_name}</div>
                                  <div className="text-[10px] text-gray-400">{[b.phone, b.country].filter(Boolean).join(' · ')}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div><input name="buyer_email" type="email" value={form.buyer_email} onChange={handleChange} placeholder="Buyer email" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                        <div><input name="buyer_phone" type="tel" value={form.buyer_phone} onChange={handleChange} placeholder="Buyer phone" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                        <div><input name="buyer_country" value={form.buyer_country} onChange={handleChange} placeholder="Buyer country" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-2">Photos</label>
                    {/* Thumbnail strip */}
                    {(() => {
                      const existingUrls = form.image_urls ? form.image_urls.split(',').map(s => s.trim()).filter(Boolean) : [];
                      const allPhotos = [
                        ...existingUrls.map((url, i) => ({ type: 'url', url, key: `url-${i}` })),
                        ...photoFiles.map((pf, i) => ({ type: 'file', url: pf.preview, key: `file-${i}` })),
                      ];
                      return allPhotos.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {allPhotos.map((photo, i) => (
                            <div key={photo.key} className="relative group w-16 h-16 shrink-0">
                              <img src={photo.url} alt="" className="w-full h-full object-cover rounded-lg border-2 border-gray-200" onError={e => { e.target.style.opacity='0.3'; }} />
                              <button type="button" onClick={() => removePhoto(i)}
                                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-[11px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">×</button>
                              {photo.type === 'file' && (
                                <span className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[7px] text-center font-bold py-0.5 rounded-b-lg">NEW</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {/* Upload drop zone */}
                    <label className={`flex items-center gap-2 sm:gap-3 cursor-pointer border-2 border-dashed rounded-lg px-3 sm:px-4 py-3 transition ${photoUploading ? 'border-primary/40 bg-blue-50' : 'border-gray-300 hover:border-primary'}`}>
                      <span className="text-xs font-bold text-red-500 mr-1">[{(form.image_urls ? form.image_urls.split(',').map(s => s.trim()).filter(Boolean).length : 0) + photoFiles.length}]</span>
                      <i className={`fas ${photoUploading ? 'fa-spinner animate-spin text-primary' : 'fa-cloud-upload-alt text-gray-400'} text-lg sm:text-xl`} />
                      <span className={`text-xs sm:text-sm ${photoUploading ? 'text-primary font-medium' : 'text-gray-400'}`}>
                        {photoUploading ? 'Uploading…' : 'Click to add photos'}
                      </span>
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                    </label>
                    {/* Fallback URL paste */}
                    <input name="image_urls" value={form.image_urls} onChange={handleChange}
                      className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 placeholder-gray-300 focus:outline-none focus:border-primary"
                      placeholder="Or paste image URLs (comma-separated)" />
                  </div>

                  <div className="col-span-2"><label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Description</label><textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" /></div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-2">Options / Equipment</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                      {EQUIPMENT_LIST.map(item => {
                        const checked = form.options.includes(item);
                        return (
                          <button key={item} type="button" onClick={() => toggleOption(item)}
                            className={`px-2 py-1.5 rounded text-xs font-medium border text-center transition ${checked ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                            {checked && <i className="fas fa-check text-green-500 mr-1 text-[11px]" />}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
{/* Fixed footer */}
              <div className="shrink-0 border-t border-gray-100 px-5 py-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-lg text-xs font-bold uppercase text-gray-600 border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={formSaving || photoUploading} className="text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2" style={{ backgroundColor: NAVY }}>
                  {formSaving && <i className="fas fa-spinner animate-spin text-xs" />}
                  {formSaving ? 'Saving…' : (editItem ? 'Update' : 'Add') + ' Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
      )}

      {loading ? (
        <div className="flex justify-center py-12"><i className="fas fa-circle-notch animate-spin text-2xl text-primary" /></div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md2:hidden divide-y divide-gray-100">
            {pagedVehicles.length === 0 ? (
              <div className="px-3 md:px-6 py-8 md:py-12 text-center text-gray-400"><i className="fas fa-car text-xl md:text-2xl mb-2 block" />No vehicles found</div>
            ) : pagedVehicles.map((v) => (
              <div key={v.id} className="p-3 sm:p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{v.make} {v.model}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Ref {v.ref_no || '-'}</p>
                    {v.buyer_name && <p className="text-[10px] text-gray-500 truncate"><i className="fas fa-user mr-1" />{v.buyer_name}{v.buyer_country ? ` · ${v.buyer_country}` : ''}</p>}
                  </div>
                  {subView !== '3rdParty' && <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span>}
                  {subView === 'inventory' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelect(v.id)}
                      className="accent-red-600 cursor-pointer mt-0.5"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{v.year} · {v.mileage ? `${Number(v.mileage).toLocaleString()} km` : '-'}</span>
                  <span className="font-semibold text-gray-900">{displayCurrency(v)} {Number(v.price).toLocaleString()}</span>
                </div>
                {subView !== '3rdParty' && v.created_by_name && <p className="text-[10px] text-gray-400">Added by {v.created_by_name}</p>}
                {v.status === 'reserved' && v.expires_at && (
                  <p className={`text-[10px] ${new Date(v.expires_at) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                    <i className="fas fa-clock mr-1" />Expires {new Date(v.expires_at).toLocaleDateString()}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => setDetailItem(v)} className="text-gray-400 hover:text-gray-600 transition text-sm p-1"><i className="fas fa-eye" /></button>
                  {subView === '3rdParty' ? (
                    <>
                    <a href={`/vehicle/${encodeURIComponent(v.ref_no || v.id)}`} target="_blank" rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700 transition text-sm p-1" title="View on site">
                      <i className="fas fa-external-link-alt" />
                    </a>
                    <button onClick={() => handleImportThirdParty(v)} disabled={importingSupplier}
                      className="text-primary hover:text-primary/70 transition text-sm p-1 disabled:opacity-40" title="Import to Inventory">
                      {importingSupplier ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-file-import" />}
                    </button>
                    {isAvailableStatus(v.status) && (
                      <>
                        <button onClick={() => setReserveModal(v)} disabled={actionLoading === v.ref_no}
                          className="text-amber-600 hover:text-amber-700 transition text-sm p-1 disabled:opacity-40" title="Reserve">
                          {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-hand-paper" />}
                        </button>
                        <button onClick={() => setSoldModal(v)} disabled={actionLoading === v.ref_no}
                          className="text-red-600 hover:text-red-700 transition text-sm p-1 disabled:opacity-40" title="Mark as Sold">
                          <i className="fas fa-check-circle" />
                        </button>
                      </>
                    )}
                    {v.status === 'reserved' && (
                      <button onClick={() => handleVehicleAction(v.ref_no, 'unreserve')} disabled={actionLoading === v.ref_no}
                        className="text-blue-600 hover:text-blue-700 transition text-sm p-1 disabled:opacity-40" title="Unreserve">
                        {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-undo" />}
                      </button>
                    )}
                    </>
                  ) : (
                    <>
                  <a href={`/vehicle/${encodeURIComponent(v.ref_no || v.id)}`} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 transition text-sm p-1" title="View on site">
                    <i className="fas fa-external-link-alt" />
                  </a>
                  <button onClick={() => openEdit(v)} className="text-primary hover:text-primary/70 transition text-sm p-1"><i className="fas fa-edit" /></button>
                  <button onClick={() => handleIssueInvoice(v)} className="text-blue-600 hover:text-blue-700 transition text-sm p-1" title="Issue Invoice"><i className="fas fa-file-invoice" /></button>
                  {isAvailableStatus(v.status) && (
                    <>
                      <button onClick={() => setReserveModal(v)} disabled={actionLoading === v.ref_no}
                        className="text-amber-600 hover:text-amber-700 transition text-sm p-1 disabled:opacity-40" title="Reserve">
                        {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-hand-paper" />}
                      </button>
                      <button onClick={() => setSoldModal(v)} disabled={actionLoading === v.ref_no}
                        className="text-red-600 hover:text-red-700 transition text-sm p-1 disabled:opacity-40" title="Mark as Sold">
                        <i className="fas fa-check-circle" />
                      </button>
                    </>
                  )}
                  {v.status === 'reserved' && (
                    <>
                      <button onClick={() => handleVehicleAction(v.ref_no, 'unreserve')} disabled={actionLoading === v.ref_no}
                        className="text-blue-600 hover:text-blue-700 transition text-sm p-1 disabled:opacity-40" title="Unreserve">
                        {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-undo" />}
                      </button>
                      <button onClick={() => setSoldModal(v)} disabled={actionLoading === v.ref_no}
                        className="text-red-600 hover:text-red-700 transition text-sm p-1 disabled:opacity-40" title="Mark as Sold">
                        <i className="fas fa-check-circle" />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(v.id)} className="text-red-400 hover:text-red-600 transition text-sm p-1"><i className="fas fa-trash-alt" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md2:block overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {subView === 'inventory' && (
                    <th className="px-3 md:px-4 py-3 md:py-4 w-px">
                      <input
                        type="checkbox"
                        checked={pagedVehicles.length > 0 && pagedVehicles.every(v => selectedIds.has(v.id))}
                        onChange={toggleSelectAll}
                        className="accent-red-600 cursor-pointer"
                        title="Select all on this page"
                      />
                    </th>
                  )}
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Ref</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Make / Model</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Year</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Price</th>
                  <th className="hidden lg:table-cell px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Mileage</th>
                  {subView !== '3rdParty' && <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Status</th>}
                  {subView !== '3rdParty' && <th className="hidden lg:table-cell px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Added By</th>}
                  <th className="px-3 md:px-6 py-3 md:py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap w-px">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedVehicles.map((v) => (
                  <tr key={v.id} className={`hover:bg-gray-50 transition ${selectedIds.has(v.id) ? 'bg-red-50/60' : ''}`}>
                    {subView === 'inventory' && (
                      <td className="px-3 md:px-4 py-3 md:py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(v.id)}
                          onChange={() => toggleSelect(v.id)}
                          className="accent-red-600 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-500 font-mono text-[10px] md:text-xs">
                      {v.ref_no || '-'}
                      {v.supplier_ref && <span className="block text-[9px] text-gray-400">sup: {v.supplier_ref}</span>}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <span className="block font-semibold text-gray-900">{v.make}</span>
                      <span className="block text-[11px] text-gray-500 truncate max-w-[180px]">{v.model}</span>
                      {v.buyer_name && <span className="block text-[10px] text-gray-400 truncate max-w-[180px]"><i className="fas fa-user mr-1" />{v.buyer_name}</span>}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-600">{v.year}</td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-gray-900 font-semibold text-xs sm:text-sm">{displayCurrency(v)} {Number(v.price).toLocaleString()}</td>
                    <td className="hidden lg:table-cell px-3 md:px-6 py-3 md:py-4 text-gray-500">{v.mileage ? formatNumberWithUnit(v.mileage) : '-'}</td>
                    {subView !== '3rdParty' && (
                    <td className="px-3 md:px-6 py-3 md:py-4">
                      <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 rounded ${statusBadgeClass(v.status)}`}>{statusLabel(v.status)}</span>
                      {v.status === 'reserved' && v.expires_at && (
                        <span className={`block text-[9px] mt-0.5 ${new Date(v.expires_at) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                          <i className="fas fa-clock mr-1" />{new Date(v.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    )}
                    {subView !== '3rdParty' && <td className="hidden lg:table-cell px-3 md:px-6 py-3 md:py-4 text-gray-400 text-[10px]">{v.created_by_name || '—'}</td>}
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-px">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setDetailItem(v)} className="text-gray-400 hover:text-gray-600 transition text-sm" title="View details"><i className="fas fa-eye" /></button>
                        {subView === '3rdParty' ? (
                          <>
                            <a href={`/vehicle/${encodeURIComponent(v.ref_no || v.id)}`} target="_blank" rel="noopener noreferrer"
                              className="text-gray-500 hover:text-gray-700 transition text-sm" title="View on site">
                              <i className="fas fa-external-link-alt" />
                            </a>
                            <button onClick={() => handleImportThirdParty(v)} disabled={importingSupplier}
                              className="text-primary hover:text-primary/70 transition text-sm disabled:opacity-40" title="Import to Inventory">
                              {importingSupplier ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-file-import" />}
                            </button>
                            <button onClick={() => handleIssueInvoice(v)} className="text-blue-600 hover:text-blue-700 transition text-sm" title="Issue Invoice"><i className="fas fa-file-invoice" /></button>
                            {isAvailableStatus(v.status) && (
                              <>
                                <button onClick={() => setReserveModal(v)} disabled={actionLoading === v.ref_no}
                                  className="text-amber-600 hover:text-amber-700 transition text-sm disabled:opacity-40" title="Reserve">
                                  {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-hand-paper" />}
                                </button>
                                <button onClick={() => setSoldModal(v)} disabled={actionLoading === v.ref_no}
                                  className="text-red-600 hover:text-red-700 transition text-sm disabled:opacity-40" title="Mark as Sold">
                                  <i className="fas fa-check-circle" />
                                </button>
                              </>
                            )}
                            {v.status === 'reserved' && (
                              <button onClick={() => handleVehicleAction(v.ref_no, 'unreserve')} disabled={actionLoading === v.ref_no}
                                className="text-blue-600 hover:text-blue-700 transition text-sm disabled:opacity-40" title="Unreserve">
                                {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-undo" />}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                        {isAvailableStatus(v.status) && (
                          <>
                            <button onClick={() => setReserveModal(v)} disabled={actionLoading === v.ref_no}
                              className="text-amber-600 hover:text-amber-700 transition text-sm disabled:opacity-40" title="Reserve">
                              {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-hand-paper" />}
                            </button>
                            <button onClick={() => setSoldModal(v)} disabled={actionLoading === v.ref_no}
                              className="text-red-600 hover:text-red-700 transition text-sm disabled:opacity-40" title="Mark as Sold">
                              <i className="fas fa-check-circle" />
                            </button>
                          </>
                        )}
                        {v.status === 'reserved' && (
                          <>
                            <button onClick={() => handleVehicleAction(v.ref_no, 'unreserve')} disabled={actionLoading === v.ref_no}
                              className="text-blue-600 hover:text-blue-700 transition text-sm disabled:opacity-40" title="Unreserve">
                              {actionLoading === v.ref_no ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-undo" />}
                            </button>
                            <button onClick={() => setSoldModal(v)} disabled={actionLoading === v.ref_no}
                              className="text-red-600 hover:text-red-700 transition text-sm disabled:opacity-40" title="Mark as Sold">
                              <i className="fas fa-check-circle" />
                            </button>
                          </>
                        )}
                        <a href={`/vehicle/${encodeURIComponent(v.ref_no || v.id)}`} target="_blank" rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700 transition text-sm" title="View on site">
                          <i className="fas fa-external-link-alt" />
                        </a>
                        <button onClick={() => openEdit(v)} className="text-primary hover:text-primary/70 transition text-sm" title="Edit"><i className="fas fa-edit" /></button>
                        <button onClick={() => handleIssueInvoice(v)} className="text-blue-600 hover:text-blue-700 transition text-sm" title="Issue Invoice"><i className="fas fa-file-invoice" /></button>
                        {!isSales && <button onClick={() => handleDelete(v.id)} className="text-red-400 hover:text-red-600 transition text-sm" title="Delete"><i className="fas fa-trash-alt" /></button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedVehicles.length === 0 && (
                  <tr><td colSpan={subView === '3rdParty' ? 5 : 7} className="px-3 md:px-6 py-8 md:py-12 text-center text-gray-400"><i className="fas fa-car text-xl md:text-2xl mb-2 block" />No vehicles found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
      </div>}
{detailItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
              <h3 className="font-bebas text-lg" style={{ color: NAVY }}>Vehicle Details</h3>
              <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600 p-1" title="Close"><i className="fas fa-times text-lg" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm p-4">
              <div className="col-span-2 border-b border-gray-100 pb-1"><h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Vehicle Info</h4></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Ref</span><p className="text-gray-900">{detailItem.ref_no || '-'}</p></div>
              {detailItem.supplier_ref && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Supplier Ref</span><p className="text-gray-900 font-mono">{detailItem.supplier_ref}</p></div>}
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Make</span><p className="text-gray-900 font-semibold">{detailItem.make}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Model</span><p className="text-gray-900">{detailItem.model}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Year</span><p className="text-gray-900">{detailItem.year || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Price</span><p className="text-gray-900 font-semibold">{displayCurrency(detailItem)} {Number(detailItem.price).toLocaleString()}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Status</span><p className={`text-[10px] font-bold uppercase px-2 py-1 rounded inline-block ${statusBadgeClass(detailItem.status)}`}>{statusLabel(detailItem.status)}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Mileage</span><p className="text-gray-900">{formatNumberWithUnit(detailItem.mileage) || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Engine</span><p className="text-gray-900">{formatNumberWithUnit(detailItem.engine_capacity) || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Transmission</span><p className="text-gray-900">{detailItem.transmission || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Fuel</span><p className="text-gray-900">{detailItem.fuel || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Color</span><p className="text-gray-900">{detailItem.color || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Chassis</span><p className="text-gray-900">{detailItem.chassis_no || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Doors</span><p className="text-gray-900">{detailItem.doors || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Seats</span><p className="text-gray-900">{detailItem.seats || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Drive</span><p className="text-gray-900">{detailItem.drive || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Steering</span><p className="text-gray-900">{detailItem.steering || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Grade</span><p className="text-gray-900">{detailItem.grade || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Model Code</span><p className="text-gray-900">{detailItem.model_code || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Location</span><p className="text-gray-900">{detailItem.location || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Category</span><p className="text-gray-900">{detailItem.category || '-'}</p></div>
              <div className="col-span-2"><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Description</span><p className="text-gray-900">{detailItem.description || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Added By</span><p className="text-gray-900">{detailItem.created_by_name || '-'}</p></div>
              <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Created</span><p className="text-gray-900">{detailItem.created_at ? new Date(detailItem.created_at).toLocaleDateString() : '-'}</p></div>
              {detailItem.updated_at && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Updated</span><p className="text-gray-900">{new Date(detailItem.updated_at).toLocaleDateString()}</p></div>}
              <div className="col-span-2"><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Options / Equipment</span><p className="text-gray-900">{Array.isArray(detailItem.options) && detailItem.options.length > 0 ? detailItem.options.join(', ') : '-'}</p></div>
              {(detailItem.buyer_name || detailItem.buyer_email || detailItem.buyer_phone) && (
                <>
                  <div className="col-span-2 border-b border-gray-100 pb-1 mt-2"><h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Buyer Details</h4></div>
                  {detailItem.buyer_name && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Name</span><p className="text-gray-900">{detailItem.buyer_name}</p></div>}
                  {detailItem.buyer_email && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Email</span><p className="text-gray-900">{detailItem.buyer_email}</p></div>}
                  {detailItem.buyer_phone && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Phone</span><p className="text-gray-900">{detailItem.buyer_phone}</p></div>}
                  {detailItem.buyer_country && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Country</span><p className="text-gray-900">{detailItem.buyer_country}</p></div>}
                </>
              )}
              {detailItem.status === 'reserved' && detailItem.expires_at && (
                <>
                  <div className="col-span-2 border-b border-gray-100 pb-1 mt-2"><h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Reservation</h4></div>
                  <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Expires At</span><p className={`text-sm font-semibold ${new Date(detailItem.expires_at) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>{new Date(detailItem.expires_at).toLocaleString()}</p></div>
                  {detailItem.extended_by > 0 && <div><span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">Extended By</span><p className="text-gray-900">{detailItem.extended_by}h total</p></div>}
                </>
              )}
              {(() => {
                const urls = detailItem.image_urls ? detailItem.image_urls.split(',').map(s => s.trim()).filter(Boolean) : [];
                return urls.length > 0 ? (
                  <div className="col-span-2">
                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-2">Images</span>
                    <div className="flex flex-wrap gap-2">
                      {urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition">
                          <img src={url} alt="" className="w-full h-full object-cover" onError={e => { e.target.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23ccc%22><path d=%22M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z%22/></svg>'; }} />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

{soldModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setSoldModal(null); setShowBuyerSuggestions(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: NAVY }}>
              <h3 className="font-bebas text-lg text-white">Mark as Sold</h3>
              <p className="text-xs text-white/70 mt-0.5">{soldModal.make} {soldModal.model} — {soldModal.ref_no}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-2">Sale Type</label>
                <select id="saleTypeSelect" defaultValue="sold" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                  <option value="sold">Sold (Standard)</option>
                  <option value="sold_shipping">Sold — Shipping</option>
                  <option value="sold_by_owner">Sold by Owner</option>
                  <option value="sold_locally">Sold Locally</option>
                </select>
              </div>
              <div className="border-t border-gray-100 pt-3 relative">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-2">Buyer Details <span className="text-gray-300 normal-case">(optional)</span></p>
                <div className="space-y-2">
                  <div className="relative">
                    <input id="soldBuyerName" type="text" placeholder="Buyer name"
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      onChange={e => filterBuyers(e.target.value, 'sold')}
                      onFocus={() => filterBuyers(document.getElementById('soldBuyerName').value, 'sold')}
                      onBlur={() => setTimeout(() => setShowBuyerSuggestions(null), 200)} />
                    {showBuyerSuggestions === 'sold' && buyerSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {buyerSuggestions.map((b, i) => (
                          <button key={i} type="button" onMouseDown={() => selectBuyer(b, 'sold')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 transition border-b border-gray-50 last:border-0">
                            <div className="font-medium text-gray-900">{b.full_name}</div>
                            <div className="text-[10px] text-gray-400">{[b.phone, b.country].filter(Boolean).join(' · ')}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input id="soldBuyerEmail" type="email" placeholder="Buyer email" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input id="soldBuyerPhone" type="tel" placeholder="Buyer phone" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input id="soldBuyerCountry" type="text" placeholder="Buyer country" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setSoldModal(null); setShowBuyerSuggestions(null); }} className="px-4 py-2 rounded-lg text-xs font-bold uppercase text-gray-600 border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
              <button
                onClick={() => {
                  const saleType = document.getElementById('saleTypeSelect').value;
                  const buyerDetails = {
                    buyer_name: document.getElementById('soldBuyerName').value.trim(),
                    buyer_email: document.getElementById('soldBuyerEmail').value.trim(),
                    buyer_phone: document.getElementById('soldBuyerPhone').value.trim(),
                    buyer_country: document.getElementById('soldBuyerCountry').value.trim(),
                  };
                  handleVehicleAction(soldModal.ref_no, 'mark_sold', saleType, buyerDetails, null, soldModal);
                }}
                disabled={actionLoading === soldModal.ref_no}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-red-700 transition disabled:opacity-60 flex items-center gap-2"
              >
                {actionLoading === soldModal.ref_no && <i className="fas fa-spinner animate-spin text-xs" />}
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

{reserveModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setReserveModal(null); setShowBuyerSuggestions(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100" style={{ backgroundColor: NAVY }}>
              <h3 className="font-bebas text-lg text-white">Reserve Vehicle</h3>
              <p className="text-xs text-white/70 mt-0.5">{reserveModal.make} {reserveModal.model} — {reserveModal.ref_no}</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase mb-2">Reservation Duration</label>
                <div className="flex gap-2">
                  {[24, 48, 72, 168].map(h => (
                    <button key={h} type="button" onClick={() => setReserveDuration(h)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border-2 ${reserveDuration === h ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}>
                      {h < 48 ? `${h}h` : h === 48 ? '2d' : h === 72 ? '3d' : '7d'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Expires {new Date(Date.now() + reserveDuration * 3600000).toLocaleString()}</p>
              </div>
              <div className="border-t border-gray-100 pt-3 relative">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase mb-2">Buyer Details <span className="text-gray-300 normal-case">(optional)</span></p>
                <div className="space-y-2">
                  <div className="relative">
                    <input id="reserveBuyerName" type="text" placeholder="Buyer name"
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      onChange={e => filterBuyers(e.target.value, 'reserve')}
                      onFocus={() => filterBuyers(document.getElementById('reserveBuyerName').value, 'reserve')}
                      onBlur={() => setTimeout(() => setShowBuyerSuggestions(null), 200)} />
                    {showBuyerSuggestions === 'reserve' && buyerSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {buyerSuggestions.map((b, i) => (
                          <button key={i} type="button" onMouseDown={() => selectBuyer(b, 'reserve')}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition border-b border-gray-50 last:border-0">
                            <div className="font-medium text-gray-900">{b.full_name}</div>
                            <div className="text-[10px] text-gray-400">{[b.phone, b.country].filter(Boolean).join(' · ')}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input id="reserveBuyerEmail" type="email" placeholder="Buyer email" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input id="reserveBuyerPhone" type="tel" placeholder="Buyer phone" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                  <input id="reserveBuyerCountry" type="text" placeholder="Buyer country" className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setReserveModal(null); setShowBuyerSuggestions(null); }} className="px-4 py-2 rounded-lg text-xs font-bold uppercase text-gray-600 border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
              <button
                onClick={() => {
                  const buyerDetails = {
                    buyer_name: document.getElementById('reserveBuyerName').value.trim(),
                    buyer_email: document.getElementById('reserveBuyerEmail').value.trim(),
                    buyer_phone: document.getElementById('reserveBuyerPhone').value.trim(),
                    buyer_country: document.getElementById('reserveBuyerCountry').value.trim(),
                  };
                  handleVehicleAction(reserveModal.ref_no, 'reserve', null, buyerDetails, reserveDuration, reserveModal);
                }}
                disabled={actionLoading === reserveModal.ref_no}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-amber-700 transition disabled:opacity-60 flex items-center gap-2"
              >
                {actionLoading === reserveModal.ref_no && <i className="fas fa-spinner animate-spin text-xs" />}
                Confirm Reserve
              </button>
            </div>
          </div>
        </div>
      )}

      {showMakesModels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowMakesModels(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: NAVY }}>Manage Makes &amp; Models</h3>
              <button onClick={() => setShowMakesModels(false)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-2xl" /></button>
            </div>

            <div className="flex gap-2 mb-4">
              <input value={mmNewMake} onChange={e => setMmNewMake(e.target.value)} placeholder="New make *" className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#d1d5db' }} />
              <input value={mmNewModel} onChange={e => setMmNewModel(e.target.value)} placeholder="Model (optional)" className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#d1d5db' }} onKeyDown={e => { if (e.key === 'Enter') handleAddMakeModel(); }} />
              <button onClick={handleAddMakeModel} disabled={mmSaving || !mmNewMake.trim()} className="text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-60 shrink-0" style={{ backgroundColor: NAVY }}>
                {mmSaving ? <i className="fas fa-spinner animate-spin" /> : <i className="fas fa-plus" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
              {mmLoading ? (
                <div className="p-6 text-center text-gray-400 text-sm"><i className="fas fa-spinner animate-spin mr-2" />Loading...</div>
              ) : mmItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No makes/models available.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-[10px] font-extrabold text-gray-400 uppercase">
                      <th className="text-left px-3 py-2">Make</th>
                      <th className="text-left px-3 py-2">Models</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mmItems.map(item => (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                        {mmEditing === item.id ? (
                          <>
                            <td colSpan={2} className="px-3 py-2"><input value={mmEditMake} onChange={e => setMmEditMake(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary" onKeyDown={e => { if (e.key === 'Enter') handleSaveMakeModel(); if (e.key === 'Escape') setMmEditing(null); }} /></td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button onClick={handleSaveMakeModel} disabled={mmSaving} className="text-green-600 hover:text-green-800 text-sm mr-2" title="Save"><i className={mmSaving ? 'fas fa-spinner animate-spin' : 'fas fa-check'} /></button>
                              <button onClick={() => setMmEditing(null)} className="text-gray-400 hover:text-gray-600 text-sm" title="Cancel"><i className="fas fa-times" /></button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 font-medium text-gray-700">{titleCaseMake(item.make)}</td>
                            <td className="px-3 py-2 text-gray-500">{item.count ? `${item.count} model${item.count > 1 ? 's' : ''}` : <span className="text-gray-300 italic">No models</span>}</td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button onClick={() => handleEditMakeModel(item)} className="text-blue-500 hover:text-blue-700 text-sm mr-2" title="Edit"><i className="fas fa-pen" /></button>
                              <button onClick={() => handleDeleteMakeModel(item.id)} className="text-red-400 hover:text-red-600 text-sm" title="Delete"><i className="fas fa-trash" /></button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

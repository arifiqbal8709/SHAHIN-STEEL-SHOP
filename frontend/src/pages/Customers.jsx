import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  IndianRupee,
  FileText,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Building,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Pencil,
  Trash2
} from 'lucide-react';
import { customersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Customers = () => {
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL | DUE | CLEAR

  // Add Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    opening_balance: 0,
    notes: ''
  });

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll();
      if (res && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // Auto-update customer management when a new bill is made anywhere
    window.addEventListener('shahin-cloud-sync', loadCustomers);
    return () => window.removeEventListener('shahin-cloud-sync', loadCustomers);
  }, []);

  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm(`Are you sure you want to delete customer "${cust.name}"? This action cannot be undone.`)) return;
    try {
      const res = await customersAPI.delete(cust.id);
      if (res && res.success) {
        loadCustomers();
      } else {
        alert(res?.message || 'Failed to delete customer');
      }
    } catch (err) {
      alert('Error deleting customer: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllCustomers = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL customers? All customer records will be permanently removed so you can enter fresh data!')) return;
    try {
      const res = await customersAPI.deleteAll();
      if (res && res.success) {
        alert('All customers have been cleared successfully!');
        loadCustomers();
      } else {
        alert(res?.message || 'Failed to clear customers');
      }
    } catch (err) {
      alert('Error clearing customers: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = () => {
    setFormError('');
    setFormSuccess('');
    setFormData({
      name: '',
      phone: '',
      alternate_phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      opening_balance: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleOpenEditModal = (cust) => {
    setEditError('');
    setEditSuccess('');
    setEditData({
      id: cust.id,
      customer_code: cust.customer_code,
      name: cust.name || '',
      phone: cust.phone || '',
      alternate_phone: cust.alternate_phone || '',
      address: cust.address || '',
      city: cust.city || 'Chas, Bokaro',
      state: cust.state || 'Jharkhand',
      pincode: cust.pincode || '827013',
      total_outstanding: cust.total_outstanding !== undefined ? cust.total_outstanding : 0,
      notes: cust.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditError('');
    setEditSuccess('');
    setEditData(null);
  };

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!editData) return;
    setEditError('');
    setEditSuccess('');

    if (!editData.name.trim()) {
      setEditError('Customer name is required.');
      return;
    }

    const cleanPhone = editData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setEditError('Valid 10-digit mobile number is required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await customersAPI.update(editData.id, {
        ...editData,
        phone: cleanPhone,
        alternate_phone: editData.alternate_phone ? editData.alternate_phone.trim() : ''
      });

      if (res && (res.success || res.data || res.id)) {
        setEditSuccess('Customer details updated successfully!');
        await loadCustomers();
        setTimeout(() => {
          handleCloseEditModal();
        }, 700);
      } else {
        setEditError(res?.message || 'Failed to update customer.');
      }
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Error updating customer.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.name.trim()) {
      setFormError('Customer name is required.');
      return;
    }

    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError('Valid 10-digit mobile number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await customersAPI.create({
        ...formData,
        phone: cleanPhone,
        alternate_phone: formData.alternate_phone ? formData.alternate_phone.trim() : ''
      });

      if (res && (res.success || res.id || res.data)) {
        setFormSuccess('Customer registered successfully!');
        await loadCustomers();
        setTimeout(() => {
          handleCloseModal();
        }, 800);
      } else {
        setFormError(res?.message || 'Failed to save customer. Please try again.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Error creating customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBillForCustomer = (cust) => {
    navigate('/sales/new', {
      state: {
        customer: {
          name: cust.name,
          phone: cust.phone,
          address: cust.address || '',
          city: cust.city || 'Chas, Bokaro',
          state: cust.state || 'Jharkhand'
        }
      }
    });
  };

  const filtered = customers.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.customer_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'DUE') {
      return Number(c.total_outstanding || 0) > 0;
    }
    if (filterType === 'CLEAR') {
      return Number(c.total_outstanding || 0) <= 0;
    }
    return true;
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const totalSpentAll = customers.reduce((acc, c) => acc + Number(c.total_spent || 0), 0);
  const totalDueAll = customers.reduce((acc, c) => acc + Number(c.total_outstanding || 0), 0);
  const dueCount = customers.filter(c => Number(c.total_outstanding || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">Directory</span>
          <h1 className="font-serif text-2xl font-extrabold text-[#211F1C] m-0">Customer Management</h1>
          <p className="text-xs text-[#71717A] mt-1">
            Directory of showroom buyers, credit ledgers, purchase histories, and billing shortcuts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner() && customers.length > 0 && (
            <button
              onClick={handleClearAllCustomers}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-subtle"
              title="Permanently remove all customers"
            >
              <Trash2 size={15} /> Clear All Customers
            </button>
          )}
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E5E2DE] text-[#211F1C] hover:bg-[#F7F5F0] transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#211F1C] hover:bg-[#C49A6C] text-white text-xs font-bold transition-all shadow-subtle hover:text-[#211F1C]"
          >
            <UserPlus size={16} />
            <span>+ Add New Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#A39E98] tracking-wider">Total Customers</p>
            <h3 className="font-serif text-xl font-bold text-[#211F1C] mt-1">{customers.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EEE6DB] flex items-center justify-center text-[#211F1C]">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#A39E98] tracking-wider">Total Lifetime Sales</p>
            <h3 className="font-serif text-xl font-bold text-[#211F1C] mt-1">{fmt(totalSpentAll)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EEE6DB] flex items-center justify-center text-[#211F1C]">
            <IndianRupee size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Customers With Due</p>
            <h3 className="font-serif text-xl font-bold text-rose-600 mt-1">{dueCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
            <AlertCircle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-[#A39E98] tracking-wider">Total Receivables</p>
            <h3 className="font-serif text-xl font-bold text-[#C49A6C] mt-1">{fmt(totalDueAll)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#C49A6C] border border-[#EEE6DB]">
            <Receipt size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-[#211F1C] text-white'
                : 'bg-[#F7F5F0] text-[#71717A] hover:bg-[#EEE6DB]'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('DUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'DUE'
                ? 'bg-rose-600 text-white'
                : 'bg-[#F7F5F0] text-[#71717A] hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            Pending Due ({dueCount})
          </button>
          <button
            onClick={() => setFilterType('CLEAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'CLEAR'
                ? 'bg-emerald-700 text-white'
                : 'bg-[#F7F5F0] text-[#71717A] hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            Fully Cleared ({customers.length - dueCount})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
          <input
            type="text"
            placeholder="Search name, phone, code, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name & City</th>
                <th>Phone Number</th>
                <th>Delivery Address</th>
                <th>Lifetime Purchases</th>
                <th>Current Balance / Due</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-xs text-[#71717A]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-[#C49A6C]" />
                      <span>Loading customer records...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-xs text-[#71717A]">
                    <Users size={32} className="mx-auto mb-2 text-[#A39E98] opacity-50" />
                    <p className="font-bold text-[#211F1C]">No customers found matching your criteria</p>
                    <p className="text-[11px] text-[#A39E98] mt-1">Try clearing filters or click "+ Add New Customer" above.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isDue = Number(c.total_outstanding || 0) > 0;
                  return (
                    <tr key={c.id || c.customer_code} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="font-mono text-xs font-bold text-[#C49A6C]">
                        {c.customer_code || `CUST-${c.id}`}
                      </td>
                      <td>
                        <p className="font-bold text-xs text-[#211F1C]">{c.name}</p>
                        <span className="inline-block text-[10px] text-[#71717A] bg-[#F7F5F0] px-2 py-0.5 rounded border border-[#E5E2DE] mt-0.5">
                          {c.city || 'Chas, Bokaro'}
                        </span>
                      </td>
                      <td>
                        <div className="space-y-0.5">
                          <span className="flex items-center gap-1.5 text-xs text-[#211F1C] font-semibold">
                            <Phone size={12} className="text-[#C49A6C]" /> {c.phone}
                          </span>
                          {c.alternate_phone && (
                            <span className="text-[10px] text-[#A39E98] block">
                              Alt: {c.alternate_phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-xs text-[#71717A] max-w-xs">
                        <span className="flex items-start gap-1">
                          <MapPin size={12} className="text-[#A39E98] shrink-0 mt-0.5" />
                          <span className="truncate">{(c.address || '').trim() || 'N/A'}</span>
                        </span>
                      </td>
                      <td className="font-bold text-xs text-[#211F1C]">{fmt(c.total_spent)}</td>
                      <td>
                        {isDue ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                            <AlertCircle size={12} />
                            <span>Due: {fmt(c.total_outstanding)}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 size={12} />
                            <span>Cleared</span>
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOwner() && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E2DE] hover:border-[#C49A6C] hover:bg-[#F7F5F0] text-[#211F1C] text-[11px] font-bold transition-all shadow-2xs"
                              title="Edit customer details"
                            >
                              <Pencil size={12} className="text-[#C49A6C]" />
                              <span>Edit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCreateBillForCustomer(c)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EEE6DB] hover:bg-[#C49A6C] text-[#211F1C] hover:text-[#211F1C] text-[11px] font-bold transition-all shadow-xs"
                            title="Generate new invoice for this customer"
                          >
                            <span>New Bill</span>
                            <ArrowUpRight size={13} />
                          </button>
                          {isOwner() && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(c)}
                              className="inline-flex items-center p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all shadow-2xs"
                              title="Delete customer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C49A6C] flex items-center justify-center text-[#211F1C]">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-white">Add New Customer</h2>
                  <p className="text-[11px] text-[#A39E98]">Register customer in Shahin Steel database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammad Imran / Vikram Singh"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] font-semibold focus:outline-none focus:border-[#C49A6C]"
                />
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    Primary Phone (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    Alternate Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Optional second number"
                    value={formData.alternate_phone}
                    onChange={(e) => handleInputChange('alternate_phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Showroom Delivery Address / Street / Landmark
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Near Jama Masjid, Haji Nagar, Chas"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                />
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
              </div>

              {/* Opening Due Balance */}
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Previous Outstanding Balance (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E98]" />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.opening_balance}
                    onChange={(e) => handleInputChange('opening_balance', e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <p className="text-[10px] text-[#A39E98] mt-1">If the customer has existing ledger balance from prior manual registers.</p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-[#E5E2DE] text-xs font-bold text-[#71717A] hover:bg-[#F7F5F0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#211F1C] hover:bg-[#C49A6C] text-white hover:text-[#211F1C] text-xs font-bold transition-all shadow-subtle disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Save Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal Dialog */}
      {isEditModalOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C49A6C] flex items-center justify-center text-[#211F1C]">
                  <Pencil size={16} />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-white">Edit Customer Details</h2>
                  <p className="text-[11px] text-[#A39E98]">
                    Modify customer profile &bull; Code: <span className="font-mono text-[#C49A6C] font-bold">{editData.customer_code}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleEditCustomerSubmit} className="p-6 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Customer Full Name"
                  value={editData.name}
                  onChange={(e) => handleEditInputChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] font-semibold focus:outline-none focus:border-[#C49A6C]"
                />
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    Primary Phone (10 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editData.phone}
                    onChange={(e) => handleEditInputChange('phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Optional"
                    value={editData.alternate_phone}
                    onChange={(e) => handleEditInputChange('alternate_phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Showroom Delivery Address / Street / Landmark
                </label>
                <textarea
                  rows={2}
                  placeholder="Street / Landmark"
                  value={editData.address}
                  onChange={(e) => handleEditInputChange('address', e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                />
              </div>

              {/* City, State, Pincode */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => handleEditInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editData.state}
                    onChange={(e) => handleEditInputChange('state', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editData.pincode}
                    onChange={(e) => handleEditInputChange('pincode', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
              </div>

              {/* Current Outstanding Balance */}
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
                  Adjust Ledger Outstanding Due (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E98]" />
                  <input
                    type="number"
                    min="0"
                    value={editData.total_outstanding}
                    onChange={(e) => handleEditInputChange('total_outstanding', e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs text-[#211F1C] font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
                <p className="text-[10px] text-[#A39E98] mt-1">Directly adjust pending credit balance for this customer.</p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#E5E2DE] text-xs font-bold text-[#71717A] hover:bg-[#F7F5F0] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#211F1C] hover:bg-[#C49A6C] text-white hover:text-[#211F1C] text-xs font-bold transition-all shadow-subtle disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Trash2,
  Eye,
  X,
  ArrowRight,
  Package,
  DollarSign,
  Building2,
  FileText,
  CreditCard,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { purchasesAPI, stockAPI, suppliersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const PurchaseManagement = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // New Purchase Form State
  const [supplierForm, setSupplierForm] = useState({
    supplier_id: '',
    supplier_name: '',
    supplier_phone: '',
    supplier_address: '',
    supplier_gstin: ''
  });

  const [invoiceDetails, setInvoiceDetails] = useState({
    purchase_invoice_no: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    paid_amount: 0,
    payment_mode: 'BANK_TRANSFER',
    notes: ''
  });

  const [purchaseItems, setPurchaseItems] = useState([
    {
      product_id: '',
      product_name: '',
      category: 'Steel Items',
      quantity: 1,
      unit_cost: 0,
      selling_price: 0,
      unit: 'PCS',
      is_new_product: false
    }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purRes, prodRes, supRes] = await Promise.all([
        purchasesAPI.getAll(),
        stockAPI.getAll(),
        suppliersAPI.getAll()
      ]);

      if (purRes && purRes.data) {
        setPurchases(Array.isArray(purRes.data) ? purRes.data : []);
      }
      if (prodRes && prodRes.data) {
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
      }
      if (supRes && supRes.data) {
        setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      }
    } catch (err) {
      console.error('Failed to load purchase management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('shahin-cloud-sync', loadData);
    return () => window.removeEventListener('shahin-cloud-sync', loadData);
  }, []);

  // Check URL query parameters for ?action=new & ?product_id=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prodId = params.get('product_id');
    if (params.get('action') === 'new') {
      setIsAddModalOpen(true);
      if (prodId && products.length > 0) {
        const prod = products.find(p => String(p.id) === String(prodId));
        if (prod) {
          setPurchaseItems([
            {
              product_id: prod.id,
              product_name: prod.product_name,
              category: prod.category_name || prod.category || 'Steel Items',
              quantity: 1,
              unit_cost: Number(prod.purchase_price || 0),
              selling_price: Number(prod.selling_price || 0),
              unit: prod.unit || 'PCS',
              is_new_product: false
            }
          ]);
        }
      }
    }
  }, [location.search, products]);

  // Handle Supplier Selection
  const handleSelectSupplier = (supId) => {
    if (!supId) {
      setSupplierForm({
        supplier_id: '',
        supplier_name: '',
        supplier_phone: '',
        supplier_address: '',
        supplier_gstin: ''
      });
      return;
    }
    const sup = suppliers.find(s => String(s.id) === String(supId));
    if (sup) {
      setSupplierForm({
        supplier_id: sup.id,
        supplier_name: sup.name,
        supplier_phone: sup.phone || '',
        supplier_address: sup.address || '',
        supplier_gstin: sup.gstin || ''
      });
    }
  };

  // Item Rows Handlers
  const handleAddItemRow = (isNew = false) => {
    setPurchaseItems([
      ...purchaseItems,
      {
        product_id: '',
        product_name: '',
        category: 'Steel Items',
        quantity: 1,
        unit_cost: 0,
        selling_price: 0,
        unit: 'PCS',
        is_new_product: isNew
      }
    ]);
  };

  const handleRemoveItemRow = (idx) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
    }
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...purchaseItems];
    if (field === 'product_id') {
      if (value === '__NEW_PRODUCT__') {
        updated[idx].is_new_product = true;
        updated[idx].product_id = '';
        updated[idx].product_name = '';
        updated[idx].category = 'Steel Items';
        updated[idx].unit = 'PCS';
      } else {
        updated[idx].product_id = value;
        const selectedProd = products.find(p => String(p.id) === String(value));
        if (selectedProd) {
          updated[idx].is_new_product = false;
          updated[idx].product_name = selectedProd.product_name;
          updated[idx].category = selectedProd.category_name || selectedProd.category || 'Steel Items';
          updated[idx].unit_cost = Number(selectedProd.purchase_price || 0);
          updated[idx].selling_price = Number(selectedProd.selling_price || 0);
          updated[idx].unit = selectedProd.unit || 'PCS';
        }
      }
    } else {
      updated[idx][field] = value;
    }
    setPurchaseItems(updated);
  };

  // Computed Totals
  const totalPurchaseBill = purchaseItems.reduce((acc, itm) => {
    const qty = Number(itm.quantity || 0);
    const cost = Number(itm.unit_cost || 0);
    return acc + (qty * cost);
  }, 0);

  const paidAmountVal = Number(invoiceDetails.paid_amount || 0);
  const remainingVendorDue = Math.max(0, totalPurchaseBill - paidAmountVal);

  // Quick Payment Shortcuts
  const setFullPaid = () => {
    setInvoiceDetails(prev => ({ ...prev, paid_amount: totalPurchaseBill }));
  };

  const setFiftyPercentPaid = () => {
    setInvoiceDetails(prev => ({ ...prev, paid_amount: Math.round(totalPurchaseBill / 2) }));
  };

  const setZeroPaid = () => {
    setInvoiceDetails(prev => ({ ...prev, paid_amount: 0 }));
  };

  // Submit New Purchase
  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!supplierForm.supplier_name.trim()) {
      alert('Please enter or select a Supplier / Vendor Name.');
      return;
    }

    const validItems = purchaseItems.filter(i => (i.product_id || i.product_name.trim()) && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid product with quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: supplierForm.supplier_id || null,
        supplier_name: supplierForm.supplier_name.trim(),
        supplier_phone: supplierForm.supplier_phone.trim(),
        supplier_address: supplierForm.supplier_address.trim(),
        supplier_gstin: supplierForm.supplier_gstin.trim(),
        purchase_invoice_no: invoiceDetails.purchase_invoice_no.trim(),
        purchase_date: invoiceDetails.purchase_date,
        paid_amount: paidAmountVal,
        payment_mode: invoiceDetails.payment_mode,
        notes: invoiceDetails.notes.trim(),
        items: validItems.map(itm => ({
          product_id: itm.is_new_product ? null : (itm.product_id || null),
          product_name: itm.product_name.trim(),
          category: itm.category || 'Steel Items',
          quantity: Number(itm.quantity),
          unit_cost: Number(itm.unit_cost),
          selling_price: Number(itm.selling_price || 0),
          unit: itm.unit || 'PCS'
        }))
      };

      const res = await purchasesAPI.create(payload);
      if (res && res.success) {
        // Multi-device sync
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
        setIsAddModalOpen(false);
        // Reset form
        setSupplierForm({
          supplier_id: '',
          supplier_name: '',
          supplier_phone: '',
          supplier_address: '',
          supplier_gstin: ''
        });
        setInvoiceDetails({
          purchase_invoice_no: '',
          purchase_date: new Date().toISOString().slice(0, 10),
          paid_amount: 0,
          payment_mode: 'BANK_TRANSFER',
          notes: ''
        });
        setPurchaseItems([
          {
            product_id: '',
            product_name: '',
            category: 'Steel Items',
            quantity: 1,
            unit_cost: 0,
            selling_price: 0,
            unit: 'PCS',
            is_new_product: false
          }
        ]);
        await loadData();
        if (res.purchase) {
          setSelectedPurchase(res.purchase);
        }
      } else {
        alert(res?.message || 'Failed to record purchase.');
      }
    } catch (err) {
      console.error('Purchase creation error:', err);
      alert('Error creating purchase: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Purchase & Revert Stock
  const handleDeletePurchase = async (purchaseId) => {
    if (!purchaseId) return;
    try {
      const res = await purchasesAPI.delete(purchaseId);
      if (res && res.success) {
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
        setDeleteConfirmId(null);
        await loadData();
      } else {
        alert(res?.message || 'Failed to delete purchase.');
      }
    } catch (err) {
      alert('Error deleting purchase: ' + (err.response?.data?.message || err.message));
    }
  };

  // KPI Calculations
  const totalPurchaseValue = purchases.reduce((acc, p) => acc + Number(p.total_amount || 0), 0);
  const totalPaidValue = purchases.reduce((acc, p) => acc + Number(p.paid_amount || 0), 0);
  const totalDueValue = purchases.reduce((acc, p) => acc + Number(p.balance_amount || 0), 0);
  const totalInwardUnits = purchases.reduce((acc, p) => {
    const itemsCount = (p.items || []).reduce((sum, itm) => sum + Number(itm.quantity || 0), 0);
    return acc + itemsCount;
  }, 0);

  // Filtered Purchases
  const filteredPurchases = purchases.filter(p => {
    const inv = (p.purchase_invoice_no || '').toLowerCase();
    const sup = (p.supplier_name || p.supplier?.name || '').toLowerCase();
    const itemsText = (p.items || []).map(i => (i.product_name || '').toLowerCase()).join(' ');
    const q = searchTerm.toLowerCase().trim();

    const matchesSearch = !q || inv.includes(q) || sup.includes(q) || itemsText.includes(q);
    const matchesStatus = statusFilter === 'ALL' || (p.payment_status || '').toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* ── 1. Top Bar & Action Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">
              Inventory Restock &amp; Inward
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live Auto-Add to Stock
            </span>
          </div>
          <h1 className="font-serif text-2xl font-extrabold text-[#211F1C] m-0">
            Purchase &amp; Vendor Management
          </h1>
          <p className="text-xs text-[#71717A] mt-1">
            Buy showroom furniture, auto-increase inventory stock, record vendor invoices, and track supplier dues.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/stock')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#E5E2DE] hover:bg-stone-50 text-[#211F1C] text-xs font-bold transition-all"
            title="View current showroom stock"
          >
            <Package size={15} />
            <span>View Inventory</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#211F1C] hover:bg-[#C49A6C] hover:text-[#211F1C] text-white text-xs font-extrabold transition-all shadow-subtle cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Buy / Inward New Stock</span>
          </button>
        </div>
      </div>

      {/* ── 2. KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between text-[#71717A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Purchases</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-[#211F1C]">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-[#211F1C]">{fmt(totalPurchaseValue)}</p>
          <span className="text-[10px] text-stone-500 font-semibold">{purchases.length} Recorded Bills</span>
        </div>

        {/* Total Amount Paid */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between text-[#71717A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Amount Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-emerald-800">{fmt(totalPaidValue)}</p>
          <span className="text-[10px] text-emerald-700 font-semibold">Settled to Vendors</span>
        </div>

        {/* Pending Vendor Dues */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between text-[#71717A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Vendor Due</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-rose-700">{fmt(totalDueValue)}</p>
          <span className="text-[10px] text-rose-700 font-semibold">Outstanding Payables</span>
        </div>

        {/* Total Stock Inwarded */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between text-[#71717A] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Units Inwarded</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-[#211F1C]">{totalInwardUnits} PCS</p>
          <span className="text-[10px] text-stone-500 font-semibold">Added to Live Inventory</span>
        </div>
      </div>

      {/* ── 3. Filter & Search Controls ── */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
          <input
            type="text"
            placeholder="Search by Bill #, Supplier Name, or Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#71717A] uppercase">Status:</span>
          <div className="flex items-center gap-1 bg-[#F7F5F0] p-1 rounded-xl border border-[#E5E2DE] text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-[#211F1C] text-white shadow-xs' : 'text-[#71717A]'
              }`}
            >
              All ({purchases.length})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'PAID' ? 'bg-emerald-700 text-white shadow-xs' : 'text-[#71717A]'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('PARTIAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'PARTIAL' ? 'bg-amber-600 text-white shadow-xs' : 'text-[#71717A]'
              }`}
            >
              Partial
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'UNPAID' ? 'bg-rose-700 text-white shadow-xs' : 'text-[#71717A]'
              }`}
            >
              Unpaid
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. Purchases History Table ── */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EEE6DB] text-[#211F1C] border-b border-[#E5E2DE] uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Bill / Invoice #</th>
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Inward Products</th>
                <th className="py-3 px-4 text-right">Total Bill</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DE]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-stone-500 font-medium">
                    Loading purchase history...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12">
                    <div className="max-w-md mx-auto space-y-2">
                      <ShoppingBag size={32} className="mx-auto text-stone-300" />
                      <p className="font-serif font-bold text-sm text-[#211F1C]">No Purchase Bills Found</p>
                      <p className="text-[11px] text-[#71717A]">
                        Record a new purchase bill whenever you buy stock or restock items from suppliers. Stock will automatically increase in your inventory!
                      </p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-3 px-4 py-2 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Plus size={14} /> + Record First Purchase
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((pur) => {
                  const itemsList = pur.items || [];
                  const totalQty = itemsList.reduce((s, i) => s + Number(i.quantity || 0), 0);
                  const isPaid = pur.payment_status === 'PAID';
                  const isPartial = pur.payment_status === 'PARTIAL';

                  return (
                    <tr key={pur.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                        {pur.purchase_date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#211F1C]">
                        {pur.purchase_invoice_no}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#211F1C]">
                          {pur.supplier_name || pur.supplier?.name || 'Vendor'}
                        </div>
                        {pur.supplier?.phone && (
                          <div className="text-[10px] text-stone-400">📱 {pur.supplier.phone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="truncate text-xs font-semibold text-[#211F1C]" title={itemsList.map(i => `${i.product_name} (${i.quantity})`).join(', ')}>
                          {itemsList.length > 0 ? (
                            itemsList.map(i => `${i.product_name || 'Product'} × ${i.quantity}`).join(', ')
                          ) : (
                            <span className="text-stone-400 italic">No item details</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#C49A6C]">
                          Total: {totalQty} PCS inward
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-serif font-black text-[#211F1C]">
                        {fmt(pur.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">
                        {fmt(pur.paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {Number(pur.balance_amount || 0) > 0 ? (
                          <span className="font-extrabold text-rose-700 font-mono">
                            {fmt(pur.balance_amount)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            NIL (Settled)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isPartial
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          {pur.payment_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPurchase(pur)}
                            className="p-1.5 text-stone-600 hover:text-black hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="View Purchase Details / Print"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(pur.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Purchase (Revert Stock)"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* ── 5. RECORD NEW PURCHASE MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-4 border border-stone-300 animate-fadeIn">
            {/* Modal Top Bar */}
            <div className="bg-[#211F1C] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C49A6C] text-[#211F1C] flex items-center justify-center font-bold">
                  <Truck size={17} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-white">Record New Stock Purchase</h3>
                  <p className="text-[10px] text-[#A39E98]">
                    Bought items will be automatically added to showroom stock &amp; purchase history
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-6">
              {/* Step 1: Supplier / Vendor Information */}
              <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E2DE]">
                  <span className="text-xs font-extrabold text-[#211F1C] flex items-center gap-1.5">
                    <Building2 size={15} className="text-[#C49A6C]" />
                    <span>Supplier / Vendor Information</span>
                  </span>
                  {suppliers.length > 0 && (
                    <select
                      value={supplierForm.supplier_id}
                      onChange={(e) => handleSelectSupplier(e.target.value)}
                      className="px-2.5 py-1 bg-white rounded-lg border border-[#E5E2DE] text-xs font-semibold"
                    >
                      <option value="">-- Choose Existing Supplier ({suppliers.length}) --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                      Supplier / Factory Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shahin Steel Factory Unit-1 / Bokaro Steel"
                      value={supplierForm.supplier_name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, supplier_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                      Vendor Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={supplierForm.supplier_phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, supplier_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                      Vendor GSTIN (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20AAAAA0000A1Z5"
                      value={supplierForm.supplier_gstin}
                      onChange={(e) => setSupplierForm({ ...supplierForm, supplier_gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-[#E5E2DE] text-xs font-mono uppercase focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Bill / Invoice Numbers & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                    Purchase Invoice # (Bill No.)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto (e.g. PUR-0001 or Bill #)"
                    value={invoiceDetails.purchase_invoice_no}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, purchase_invoice_no: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono font-bold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDetails.purchase_date}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={invoiceDetails.payment_mode}
                    onChange={(e) => setInvoiceDetails({ ...invoiceDetails, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Purchase Product Items */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#E5E2DE]">
                  <div>
                    <span className="text-xs font-extrabold text-[#211F1C] flex items-center gap-1.5">
                      <Package size={15} className="text-[#C49A6C]" />
                      <span>Items to Buy / Restock (Automatic Stock Addition)</span>
                    </span>
                    <p className="text-[10px] text-stone-500">
                      Choose showroom product from catalog OR add brand new product directly to inventory
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddItemRow(false)}
                      className="px-2.5 py-1 bg-[#EEE6DB] hover:bg-[#C49A6C] text-[#211F1C] rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Plus size={13} /> + Existing Item
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItemRow(true)}
                      className="px-2.5 py-1 bg-[#211F1C] hover:bg-stone-800 text-[#C49A6C] rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-[#C49A6C]/40 shadow-xs"
                    >
                      <Sparkles size={13} /> + New Product
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {purchaseItems.map((itm, idx) => {
                    const selectedProd = products.find(p => String(p.id) === String(itm.product_id));
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border grid grid-cols-12 gap-2.5 items-center transition-all ${
                          itm.is_new_product
                            ? 'bg-amber-50/40 border-amber-300'
                            : 'bg-[#FAF8F5] border-[#E5E2DE]'
                        }`}
                      >
                        {/* Product Selector / Name */}
                        <div className="col-span-12 sm:col-span-5">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-stone-500">
                              {itm.is_new_product ? '✨ Brand New Product' : '📦 Showroom Product *'}
                            </label>
                            {/* Toggle between existing and new */}
                            <div className="flex items-center bg-stone-200/70 p-0.5 rounded-lg border border-stone-300 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...purchaseItems];
                                  updated[idx].is_new_product = false;
                                  setPurchaseItems(updated);
                                }}
                                className={`px-2 py-0.5 rounded font-bold transition-all ${
                                  !itm.is_new_product ? 'bg-[#211F1C] text-white shadow-xs' : 'text-stone-600 hover:text-black'
                                }`}
                              >
                                Existing
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...purchaseItems];
                                  updated[idx].is_new_product = true;
                                  updated[idx].product_id = '';
                                  setPurchaseItems(updated);
                                }}
                                className={`px-2 py-0.5 rounded font-bold transition-all ${
                                  itm.is_new_product ? 'bg-[#C49A6C] text-[#211F1C] shadow-xs' : 'text-stone-600 hover:text-black'
                                }`}
                              >
                                + New
                              </button>
                            </div>
                          </div>

                          {!itm.is_new_product ? (
                            <select
                              value={itm.product_id}
                              onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs font-bold text-[#211F1C] truncate"
                            >
                              <option value="">-- Select Showroom Product ({products.length}) --</option>
                              <option value="__NEW_PRODUCT__" className="text-amber-800 font-extrabold bg-amber-50">
                                ✨ + Add Brand New Product (Create in Inventory)...
                              </option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.product_name} (Current Stock: {p.available_quantity} {p.unit || 'PCS'})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="space-y-1.5 animate-fadeIn">
                              <input
                                type="text"
                                required
                                placeholder="New Product Name (e.g. 6-Door Steel Almirah)"
                                value={itm.product_name}
                                onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#C49A6C] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C49A6C]"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <select
                                  value={itm.category || 'Steel Items'}
                                  onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                  className="w-full px-2 py-1 bg-white rounded-md border border-[#E5E2DE] text-[10px] font-bold text-stone-700"
                                >
                                  <option value="Steel Items">Steel Items</option>
                                  <option value="Wooden Items">Wooden Items</option>
                                  <option value="Plastic Items">Plastic Items</option>
                                </select>
                                <select
                                  value={itm.unit || 'PCS'}
                                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                  className="w-full px-2 py-1 bg-white rounded-md border border-[#E5E2DE] text-[10px] font-bold text-stone-700"
                                >
                                  <option value="PCS">PCS (Pieces)</option>
                                  <option value="SET">SET</option>
                                  <option value="NOS">NOS (Numbers)</option>
                                  <option value="DOZEN">DOZEN</option>
                                  <option value="BOX">BOX</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
                            Quantity to Add
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={itm.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value || 1)))}
                            className="w-full px-2 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs text-center font-black"
                          />
                        </div>

                        {/* Buying Price (Unit Cost) */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
                            Buying Cost (₹) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={itm.unit_cost}
                            onChange={(e) => handleItemChange(idx, 'unit_cost', Math.max(0, Number(e.target.value || 0)))}
                            className="w-full px-2 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs font-bold"
                          />
                        </div>

                        {/* Selling Price (Showroom Rate) */}
                        <div className="col-span-4 sm:col-span-2">
                          <label className="block text-[9px] font-bold text-stone-400 uppercase mb-0.5">
                            Selling Rate (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Optional"
                            value={itm.selling_price || ''}
                            onChange={(e) => handleItemChange(idx, 'selling_price', Number(e.target.value || 0))}
                            className="w-full px-2 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs font-semibold text-stone-700"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="col-span-10 sm:col-span-1 text-right">
                          <span className="block text-[9px] font-bold text-stone-400 uppercase">Total</span>
                          <span className="text-xs font-black text-[#211F1C]">
                            ₹{(Number(itm.quantity || 0) * Number(itm.unit_cost || 0)).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Existing Product Stock Preview Badge */}
                        {selectedProd && !itm.is_new_product && (
                          <div className="col-span-12 mt-1 flex flex-wrap items-center justify-between text-[11px] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-950">
                            <div className="flex items-center gap-1.5 font-bold">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span>Direct Inward to: <strong>{selectedProd.product_name}</strong></span>
                            </div>
                            <div className="flex items-center gap-3 font-semibold text-[11px]">
                              <span>Current Stock: <strong className="font-mono">{selectedProd.available_quantity} {selectedProd.unit || 'PCS'}</strong></span>
                              <span className="text-emerald-800 font-extrabold bg-emerald-200/90 px-2.5 py-0.5 rounded-full border border-emerald-400">
                                + {Number(itm.quantity || 0)} Inward = New Stock: {selectedProd.available_quantity + Number(itm.quantity || 0)} {selectedProd.unit || 'PCS'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Brand New Product Creation Badge */}
                        {itm.is_new_product && (
                          <div className="col-span-12 mt-1 flex flex-wrap items-center justify-between text-[11px] bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-950">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Sparkles size={14} className="text-amber-600 shrink-0" />
                              <span>✨ <strong>Brand New Catalog Product:</strong> Will be automatically created in Inventory</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold text-[11px]">
                              <span className="bg-amber-200/80 px-2.5 py-0.5 rounded text-amber-900 font-bold">
                                Category: {itm.category || 'Steel Items'}
                              </span>
                              <span className="bg-amber-200/80 px-2.5 py-0.5 rounded text-amber-900 font-bold">
                                Initial Stock: {itm.quantity} {itm.unit || 'PCS'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Payment Reconciliation & Total */}
              <div className="bg-[#211F1C] text-white p-5 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div>
                    <span className="text-xs font-bold text-stone-400">Total Purchase Bill:</span>
                    <p className="font-serif text-2xl font-black text-[#C49A6C]">
                      {fmt(totalPurchaseBill)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={setFullPaid}
                      className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold"
                    >
                      Full Paid (100%)
                    </button>
                    <button
                      type="button"
                      onClick={setFiftyPercentPaid}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold"
                    >
                      50% Advance
                    </button>
                    <button
                      type="button"
                      onClick={setZeroPaid}
                      className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[10px] font-bold"
                    >
                      Credit (Unpaid)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">
                      Amount Paid to Supplier Now (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalPurchaseBill}
                      value={invoiceDetails.paid_amount}
                      onChange={(e) => setInvoiceDetails({ ...invoiceDetails, paid_amount: Math.max(0, Number(e.target.value || 0)) })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-black text-sm focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-stone-400 uppercase">Remaining Balance Due:</span>
                    <p className={`font-serif text-lg font-black ${remainingVendorDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmt(remainingVendorDue)} {remainingVendorDue === 0 ? '(Fully Paid)' : '(Vendor Credit)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#211F1C] hover:bg-[#C49A6C] text-white hover:text-[#211F1C] text-xs font-black transition-all shadow-subtle flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>{submitting ? 'Recording & Inwarding Stock...' : 'Confirm Purchase & Add Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. PURCHASE DETAIL & PRINT MODAL ── */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-stone-300">
            {/* Header */}
            <div className="no-print bg-[#211F1C] text-white px-5 py-3.5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#C49A6C]" />
                <span className="font-serif font-bold text-sm">
                  Purchase Slip: {selectedPurchase.purchase_invoice_no}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-[#C49A6C] text-[#211F1C] font-extrabold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  onClick={() => setSelectedPurchase(null)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Slip Content */}
            <div className="p-6 text-black font-sans text-xs space-y-4">
              <div className="text-center pb-3 border-b border-black/20">
                <h2 className="font-serif font-black text-xl text-[#211F1C] uppercase tracking-wide">
                  M/S SHAHIN STEEL FURNITURE
                </h2>
                <p className="text-[10px] text-stone-600 font-bold uppercase tracking-wider">
                  Goods Inward &amp; Purchase Voucher (GRN)
                </p>
                <p className="text-[10px] text-stone-500">
                  Haji Nagar, Near Colonels Public School, Chas, Bokaro - 827013
                </p>
              </div>

              <div className="grid grid-cols-2 text-xs gap-3 pb-3 border-b border-stone-200">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Supplier / Vendor:</span>
                  <span className="font-bold text-sm text-[#211F1C] block">
                    {selectedPurchase.supplier_name || selectedPurchase.supplier?.name}
                  </span>
                  {selectedPurchase.supplier?.phone && (
                    <span className="text-[10px] text-stone-600 block">📱 {selectedPurchase.supplier.phone}</span>
                  )}
                  {selectedPurchase.supplier?.gstin && (
                    <span className="text-[10px] text-stone-600 font-mono block">GSTIN: {selectedPurchase.supplier.gstin}</span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Purchase Details:</span>
                  <span className="font-mono font-bold block">Bill #: {selectedPurchase.purchase_invoice_no}</span>
                  <span className="text-stone-600 block">Date: {selectedPurchase.purchase_date}</span>
                  <span className="text-stone-600 block">Mode: {selectedPurchase.payment_mode}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-black/20">
                <thead className="bg-stone-100 border-b border-black/20 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="p-2 border-r border-black/20">Product</th>
                    <th className="p-2 text-center border-r border-black/20 w-16">Qty</th>
                    <th className="p-2 text-right border-r border-black/20 w-24">Unit Cost</th>
                    <th className="p-2 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {(selectedPurchase.items || []).map((itm, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r border-black/20 font-bold uppercase">
                        {itm.product_name || 'Item'}
                      </td>
                      <td className="p-2 text-center border-r border-black/20 font-bold">
                        {itm.quantity}
                      </td>
                      <td className="p-2 text-right border-r border-black/20 font-mono">
                        {fmt(itm.unit_cost)}
                      </td>
                      <td className="p-2 text-right font-bold font-mono">
                        {fmt(itm.total_cost || (Number(itm.quantity) * Number(itm.unit_cost)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="flex justify-between items-start pt-2 border-t border-black/20">
                <div className="text-[10px] text-stone-500">
                  <span>Status: </span>
                  <strong className="text-black uppercase">{selectedPurchase.payment_status}</strong>
                </div>
                <div className="text-right space-y-1 text-xs">
                  <div className="flex justify-between gap-6">
                    <span className="text-stone-500">Total Purchase Bill:</span>
                    <span className="font-black font-mono text-sm">{fmt(selectedPurchase.total_amount)}</span>
                  </div>
                  <div className="flex justify-between gap-6 text-emerald-800">
                    <span>Paid Amount:</span>
                    <span className="font-bold font-mono">{fmt(selectedPurchase.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between gap-6 text-rose-700 font-extrabold border-t border-black/20 pt-1">
                    <span>Balance Due:</span>
                    <span className="font-mono">{fmt(selectedPurchase.balance_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-8 text-[10px] text-stone-700">
                <div>
                  <div className="w-36 border-b border-black mb-1"></div>
                  <span>Received By / Store Manager</span>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-black ml-auto mb-1"></div>
                  <span>Vendor / Authorized Signatory</span>
                </div>
              </div>
            </div>

            <div className="no-print bg-[#F7F5F0] px-6 py-3 border-t border-[#E5E2DE] flex justify-end">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-1.5 rounded-xl border border-stone-300 bg-white text-xs font-bold hover:bg-stone-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. DELETE CONFIRMATION MODAL ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-300 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertCircle size={24} />
              <h3 className="font-serif font-bold text-base text-[#211F1C]">Delete Purchase &amp; Revert Stock?</h3>
            </div>
            <p className="text-xs text-[#71717A] leading-relaxed">
              Are you sure you want to delete this purchase bill? Deleting it will <strong>automatically reduce the inwarded items from inventory stock</strong> and adjust the supplier's balance.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePurchase(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer"
              >
                Delete &amp; Revert Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;

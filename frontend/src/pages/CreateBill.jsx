import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  Users,
  UserCheck,
  X,
  Banknote,
  QrCode,
  Split,
  RefreshCw,
  Search,
  Package,
  ChevronDown
} from 'lucide-react';
import { stockAPI, salesAPI, customersAPI } from '../services/api';
import PrintInvoiceModal from '../components/PrintInvoiceModal';
import { useAuth } from '../context/AuthContext';

const CreateBill = () => {
  const { user, isOwner } = useAuth();
  const canGiveDiscount = isOwner() || user?.permissions?.can_give_discount !== false;
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdSale, setCreatedSale] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Customer Autocomplete & Search State
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [selectedCustomerDue, setSelectedCustomerDue] = useState(0);
  const customerDropdownRef = useRef(null);

  // Showroom Quick Product Search (Top bar)
  const [quickProductSearch, setQuickProductSearch] = useState('');
  const [isQuickProductDropdownOpen, setIsQuickProductDropdownOpen] = useState(false);
  const quickProductRef = useRef(null);

  // Search state for each individual item row
  const [activeItemRowSearchIdx, setActiveItemRowSearchIdx] = useState(-1);
  const [rowSearchQueries, setRowSearchQueries] = useState({});
  const itemRowRefs = useRef({});

  // Invoice Form State
  const [invoiceType, setInvoiceType] = useState('TAX_INVOICE'); // or ESTIMATE_BILL
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  });

  // Quick Add Customer Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  });
  const [quickCustError, setQuickCustError] = useState('');

  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, discount: 0, available_qty: 0, product_name: '', purchase_price: 0 }
  ]);

  const [discountOverall, setDiscountOverall] = useState(0);
  const [priceAlertModal, setPriceAlertModal] = useState({ isOpen: false, warnings: [], isOverallLoss: false, overallLoss: 0 });

  // Payment Strategy: 'PARTIAL_PAY' | 'PURE_UDHAR' | 'FULL_PAID' | 'CUSTOM'
  const [paymentPreset, setPaymentPreset] = useState('PARTIAL_PAY');
  const [fullPaidSubmode, setFullPaidSubmode] = useState('CASH'); // 'CASH' | 'UPI' | 'SPLIT_50_50'
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  const [upiRefNo, setUpiRefNo] = useState('');

  // Custom Split payment list (for ONLINE, BANK_TRANSFER, etc.)
  const [payments, setPayments] = useState([
    { mode: 'CASH', amount: 0, transaction_id: '' }
  ]);

  // EMI Financing Options
  const [isEmiSale, setIsEmiSale] = useState(false);
  const [emiPlan, setEmiPlan] = useState({
    months: 6,
    due_day: 5
  });

  useEffect(() => {
    // Check if prefilled customer passed from Customers page
    if (location.state?.customer) {
      setCustomer(prev => ({
        ...prev,
        ...location.state.customer
      }));
    }
  }, [location.state]);

  const fetchCustomers = async () => {
    try {
      const res = await customersAPI.getAll();
      if (res && res.data) {
        setCustomersList(res.data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await stockAPI.getAll();
      if (res && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Error fetching inventory for billing:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();

    // Multi-device and multi-staff live inventory sync
    window.addEventListener('shahin-cloud-sync', fetchProducts);
    const interval = setInterval(fetchProducts, 10000); // Poll every 10 seconds for live stock changes

    return () => {
      window.removeEventListener('shahin-cloud-sync', fetchProducts);
      clearInterval(interval);
    };
  }, []);

  // Handle clicking outside to close autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (quickProductRef.current && !quickProductRef.current.contains(e.target)) {
        setIsQuickProductDropdownOpen(false);
      }
      if (activeItemRowSearchIdx !== -1) {
        const ref = itemRowRefs.current[activeItemRowSearchIdx];
        if (ref && !ref.contains(e.target)) {
          setActiveItemRowSearchIdx(-1);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeItemRowSearchIdx]);

  // Select registered customer & auto-fill their info & previous dues
  const handleSelectCustomer = (cust) => {
    if (!cust) return;
    setCustomer({
      name: cust.name,
      phone: cust.phone || '',
      address: cust.address || '',
      city: cust.city || 'Chas, Bokaro',
      state: cust.state || 'Jharkhand',
      id: cust.id,
      previous_due: Number(cust.total_outstanding || 0)
    });
    setSelectedCustomerId(cust.id);
    setSelectedCustomerDue(Number(cust.total_outstanding || 0));
    setIsCustomerDropdownOpen(false);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setSelectedCustomerDue(0);
    setCustomer({
      name: '',
      phone: '',
      address: '',
      city: 'Chas, Bokaro',
      state: 'Jharkhand'
    });
    setIsCustomerDropdownOpen(false);
  };

  // Select showroom product for an individual item row
  const handleSelectProductForRow = (rowIndex, prod) => {
    if (!prod) return;
    const updated = [...items];
    updated[rowIndex].product_id = prod.id;
    updated[rowIndex].product_name = prod.product_name;
    updated[rowIndex].unit_price = Number(prod.selling_price || 0);
    updated[rowIndex].available_qty = prod.available_quantity;
    updated[rowIndex].purchase_price = Number(prod.purchase_price || 0);
    setItems(updated);
    setActiveItemRowSearchIdx(-1);
    setRowSearchQueries(prev => ({ ...prev, [rowIndex]: '' }));
  };

  // Add product from the top quick showroom search bar
  const handleQuickAddProduct = (prod) => {
    if (!prod) return;
    const emptyRowIdx = items.findIndex(itm => !itm.product_id);
    if (emptyRowIdx !== -1) {
      handleSelectProductForRow(emptyRowIdx, prod);
    } else {
      setItems(prev => [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.product_name,
          quantity: 1,
          unit_price: Number(prod.selling_price || 0),
          discount: 0,
          available_qty: prod.available_quantity,
          purchase_price: Number(prod.purchase_price || 0)
        }
      ]);
    }
    setQuickProductSearch('');
    setIsQuickProductDropdownOpen(false);
  };

  const handleSelectExistingCustomer = (custId) => {
    if (!custId) return;
    const selected = customersList.find(c => String(c.id) === String(custId));
    if (selected) {
      handleSelectCustomer(selected);
    }
  };

  const handleQuickCustomerSubmit = async (e) => {
    e.preventDefault();
    setQuickCustError('');
    if (!quickCustForm.name.trim()) {
      setQuickCustError('Customer name is required.');
      return;
    }
    const cleanPhone = quickCustForm.phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setQuickCustError('Valid 10-digit mobile number required.');
      return;
    }

    try {
      const res = await customersAPI.create({
        ...quickCustForm,
        phone: cleanPhone
      });
      if (res && (res.success || res.id || res.data)) {
        const created = res.data || res.customer || { ...quickCustForm, phone: cleanPhone };
        setCustomer({
          name: created.name,
          phone: created.phone,
          address: created.address || '',
          city: created.city || 'Chas, Bokaro',
          state: created.state || 'Jharkhand'
        });
        setIsQuickCustomerOpen(false);
        setQuickCustForm({ name: '', phone: '', address: '', city: 'Chas, Bokaro', state: 'Jharkhand' });
        fetchCustomers();
      } else {
        setQuickCustError(res?.message || 'Failed to add customer.');
      }
    } catch (err) {
      setQuickCustError(err.response?.data?.message || err.message || 'Error creating customer.');
    }
  };

  // Handle Item Row changes
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === 'product_id') {
      const selectedProd = products.find(p => p.id === Number(value));
      if (selectedProd) {
        updated[index].product_id = selectedProd.id;
        updated[index].product_name = selectedProd.product_name;
        updated[index].unit_price = Number(selectedProd.selling_price);
        updated[index].available_qty = selectedProd.available_quantity;
        updated[index].purchase_price = Number(selectedProd.purchase_price || 0);
      }
    } else {
      updated[index][field] = Number(value);
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, discount: 0, available_qty: 0, product_name: '', purchase_price: 0 }]);
  };

  const removeItemRow = (idx) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  // Calculations
  const subtotal = items.reduce((acc, itm) => acc + ((itm.quantity * itm.unit_price) - itm.discount), 0);
  const taxable = Math.max(0, subtotal - Number(discountOverall));
  const cgst = invoiceType === 'TAX_INVOICE' ? taxable * 0.09 : 0;
  const sgst = invoiceType === 'TAX_INVOICE' ? taxable * 0.09 : 0;
  const grandTotal = taxable + cgst + sgst;

  // Track items sold below purchase price (Cost Price Alert)
  const priceAlertItems = items.filter(itm => {
    if (!itm.product_id) return false;
    const prod = products.find(p => String(p.id) === String(itm.product_id));
    const pCost = Number(prod?.purchase_price || itm.purchase_price || 0);
    const qty = Math.max(1, Number(itm.quantity || 1));
    const netRate = ((qty * Number(itm.unit_price || 0)) - Number(itm.discount || 0)) / qty;
    return pCost > 0 && netRate < pCost;
  }).map(itm => {
    const prod = products.find(p => String(p.id) === String(itm.product_id));
    const pCost = Number(prod?.purchase_price || itm.purchase_price || 0);
    const qty = Math.max(1, Number(itm.quantity || 1));
    const netRate = ((qty * Number(itm.unit_price || 0)) - Number(itm.discount || 0)) / qty;
    const diff = pCost - netRate;
    return {
      product_name: itm.product_name || prod?.product_name || 'Product',
      purchase_price: pCost,
      net_rate: netRate,
      diff: diff,
      qty: qty,
      total_loss: diff * qty
    };
  });

  const totalBillCogs = items.reduce((acc, itm) => {
    const prod = products.find(p => String(p.id) === String(itm.product_id));
    const pCost = Number(prod?.purchase_price || itm.purchase_price || 0);
    return acc + (pCost * Number(itm.quantity || 0));
  }, 0);

  const isOverallBillLoss = totalBillCogs > 0 && taxable < totalBillCogs;
  const overallBillLossDiff = isOverallBillLoss ? (totalBillCogs - taxable) : 0;

  // Sync payments when paymentPreset or fullPaidSubmode changes
  useEffect(() => {
    if (grandTotal > 0) {
      if (paymentPreset === 'PURE_UDHAR') {
        setCashAmount(0);
        setUpiAmount(0);
      } else if (paymentPreset === 'FULL_PAID') {
        if (fullPaidSubmode === 'CASH') {
          setCashAmount(grandTotal);
          setUpiAmount(0);
        } else if (fullPaidSubmode === 'UPI') {
          setUpiAmount(grandTotal);
          setCashAmount(0);
        } else if (fullPaidSubmode === 'SPLIT_50_50') {
          const half = Math.round(grandTotal / 2);
          setCashAmount(half);
          setUpiAmount(grandTotal - half);
        }
      }
    }
  }, [grandTotal, paymentPreset, fullPaidSubmode]);

  // Quick 50-50 Split Handler
  const handleFiftyFiftySplit = () => {
    const half = Math.round(grandTotal / 2);
    setCashAmount(half);
    setUpiAmount(Math.max(0, grandTotal - half));
  };

  // Free-form Cash & UPI inputs for Partial Payment (does NOT overwrite the other)
  const handleCashAmountChange = (val) => {
    const c = val === '' ? 0 : Math.max(0, Number(val));
    setCashAmount(c);
  };

  const handleUpiAmountChange = (val) => {
    const u = val === '' ? 0 : Math.max(0, Number(val));
    setUpiAmount(u);
  };

  // Total Paid & Balance calculation based on active preset
  const totalPaid = paymentPreset === 'PURE_UDHAR'
    ? 0
    : (paymentPreset === 'PARTIAL_PAY'
        ? (Number(cashAmount || 0) + Number(upiAmount || 0))
        : (paymentPreset === 'FULL_PAID'
            ? grandTotal
            : payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
          )
      );

  const remainingBalance = Math.max(0, grandTotal - totalPaid);

  // EMI Monthly Installment estimation
  const monthlyInstallment = isEmiSale && emiPlan.months > 0 ? Math.round(remainingBalance / emiPlan.months) : 0;

  // Custom Split Payment Handlers
  const handlePaymentChange = (index, field, val) => {
    const updated = [...payments];
    updated[index][field] = field === 'amount' ? Number(val) : val;
    setPayments(updated);
  };

  const addPaymentMethod = () => {
    setPayments([...payments, { mode: 'UPI', amount: 0, transaction_id: '' }]);
  };

  const removePaymentMethod = (idx) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== idx));
    }
  };

  const fillRemainingPayment = (index) => {
    const updated = [...payments];
    const otherPaid = updated.reduce((acc, p, i) => i !== index ? acc + Number(p.amount || 0) : acc, 0);
    updated[index].amount = Math.max(0, grandTotal - otherPaid);
    setPayments(updated);
  };

  const handleSubmit = async (e, forceProceed = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    if (!customer.name.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      setErrorMsg('Please select at least one product with quantity.');
      return;
    }

    // Check available stock before submitting
    for (const itm of validItems) {
      const prod = products.find(p => String(p.id) === String(itm.product_id));
      if (prod && Number(itm.quantity) > Number(prod.available_quantity)) {
        setErrorMsg(`Cannot create bill: Requested ${itm.quantity} units for "${prod.product_name}", but available stock is only ${prod.available_quantity}.`);
        return;
      }
    }

    // Alert if selling below purchase price (Price Alert Confirmation)
    if (!forceProceed && (priceAlertItems.length > 0 || isOverallBillLoss)) {
      setPriceAlertModal({
        isOpen: true,
        warnings: priceAlertItems,
        isOverallLoss: isOverallBillLoss,
        overallLoss: overallBillLossDiff
      });
      return;
    }

    // Determine final payment payload
    let finalPayments = [];
    if (paymentPreset === 'PURE_UDHAR') {
      finalPayments = []; // 100% Udhar sale: paid = 0, balance = grandTotal
    } else if (paymentPreset === 'PARTIAL_PAY') {
      if (Number(cashAmount) > 0) {
        finalPayments.push({ mode: 'CASH', amount: Number(cashAmount) });
      }
      if (Number(upiAmount) > 0) {
        finalPayments.push({ mode: 'UPI', amount: Number(upiAmount), transaction_id: upiRefNo });
      }
    } else if (paymentPreset === 'FULL_PAID') {
      if (fullPaidSubmode === 'CASH') {
        finalPayments.push({ mode: 'CASH', amount: grandTotal });
      } else if (fullPaidSubmode === 'UPI') {
        finalPayments.push({ mode: 'UPI', amount: grandTotal, transaction_id: upiRefNo });
      } else if (fullPaidSubmode === 'SPLIT_50_50') {
        const half = Math.round(grandTotal / 2);
        finalPayments.push({ mode: 'CASH', amount: half });
        finalPayments.push({ mode: 'UPI', amount: grandTotal - half, transaction_id: upiRefNo });
      }
    } else {
      finalPayments = payments.filter(p => Number(p.amount || 0) > 0);
    }

    setSubmitting(true);
    try {
      const payload = {
        customer,
        items: validItems,
        discount_overall: canGiveDiscount ? discountOverall : 0,
        payments: finalPayments,
        is_emi_sale: isEmiSale,
        emi_plan: isEmiSale ? emiPlan : null,
        invoice_type: invoiceType,
        employee_id: user?.employee_id,
        sales_rep_id: user?.id
      };

      const res = await salesAPI.create(payload);
      if (res && res.success) {
        const saleWithPayments = {
          ...res.sale,
          payments: res.sale?.payments?.length ? res.sale.payments : finalPayments
        };
        setCreatedSale(saleWithPayments);
        // Instant multi-device / screen synchronization
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      } else {
        setErrorMsg(res.message || 'Failed to create sales invoice.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error creating invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sales')}
            className="p-2 rounded-xl bg-[#F7F5F0] hover:bg-[#EEE6DB] text-[#211F1C] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-serif text-xl font-bold text-[#211F1C]">Create New Sales Bill</h1>
            <p className="text-xs text-[#71717A]">Generate GST Tax Invoice or Estimate Bill with automatic stock deduction</p>
          </div>
        </div>

        {/* Invoice Type Radio */}
        <div className="flex items-center gap-2 bg-[#F7F5F0] p-1 rounded-xl border border-[#E5E2DE]">
          <button
            type="button"
            onClick={() => setInvoiceType('TAX_INVOICE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              invoiceType === 'TAX_INVOICE' ? 'bg-[#211F1C] text-white' : 'text-[#71717A]'
            }`}
          >
            GST Tax Invoice (18%)
          </button>
          <button
            type="button"
            onClick={() => setInvoiceType('ESTIMATE_BILL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              invoiceType === 'ESTIMATE_BILL' ? 'bg-[#211F1C] text-white' : 'text-[#71717A]'
            }`}
          >
            Estimate / Retail Bill
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-semibold">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details Box */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm text-[#211F1C]">Customer Details</h3>
                {selectedCustomerId ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <UserCheck size={12} /> Existing Customer Linked
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                    New / Walk-in Buyer
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717A]">
                Search &amp; select registered customer, or type directly to add a new customer
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                value={selectedCustomerId || ''}
                className="px-3 py-1.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
              >
                <option value="">-- Quick Select Customer ({customersList.length}) --</option>
                {customersList.map((c) => (
                  <option key={c.id || c.customer_code} value={c.id}>
                    {c.name} ({c.phone}){Number(c.total_outstanding || 0) > 0 ? ` • Due: ₹${Number(c.total_outstanding).toLocaleString('en-IN')}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#211F1C] hover:bg-[#C49A6C] text-white hover:text-[#211F1C] text-xs font-bold transition-all shadow-xs shrink-0"
              >
                <UserPlus size={14} />
                <span>+ Register New</span>
              </button>
            </div>
          </div>

          {/* Outstanding Due Alert if existing customer with due is selected */}
          {selectedCustomerId && selectedCustomerDue > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 font-bold animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>
                  Customer has a previous unpaid balance of <strong className="text-red-700 font-black">₹{selectedCustomerDue.toLocaleString('en-IN')}</strong>. This will be tracked in their billing history.
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedCustomer}
                className="text-[11px] underline text-stone-600 hover:text-stone-900 ml-2 shrink-0"
              >
                Switch Customer
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Customer Name with Autocomplete dropdown */}
            <div className="relative" ref={customerDropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-[#71717A] uppercase">
                  Customer Name *
                </label>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    Clear / New
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Type name or mobile..."
                  value={customer.name}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomer(prev => ({ ...prev, name: val }));
                    if (selectedCustomerId) {
                      setSelectedCustomerId(null);
                      setSelectedCustomerDue(0);
                    }
                    setIsCustomerDropdownOpen(true);
                  }}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:border-[#C49A6C] pr-8 ${
                    selectedCustomerId
                      ? 'bg-emerald-50/60 border-emerald-400 text-emerald-950 font-bold'
                      : 'bg-[#F7F5F0] border-[#E5E2DE]'
                  }`}
                />
                {customer.name ? (
                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A39E98] pointer-events-none" />
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {isCustomerDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E5E2DE] shadow-2xl z-40 max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {(() => {
                    const q = (customer.name || '').trim().toLowerCase();
                    const filtered = q
                      ? customersList.filter(c =>
                          (c.name || '').toLowerCase().includes(q) ||
                          (c.phone || '').includes(q)
                        )
                      : customersList.slice(0, 8);

                    return (
                      <>
                        <div className="p-2 bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-stone-600 flex justify-between items-center sticky top-0">
                          <span>Existing Customers ({filtered.length})</span>
                          <span className="text-[9px] text-[#C49A6C]">Click to choose</span>
                        </div>

                        {filtered.length > 0 ? (
                          filtered.map((c) => (
                            <div
                              key={c.id || c.customer_code}
                              onClick={() => handleSelectCustomer(c)}
                              className="p-2.5 hover:bg-[#F7F5F0] cursor-pointer transition-colors flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-bold text-[#211F1C] flex items-center gap-1.5">
                                  <span>{c.name}</span>
                                  {Number(c.total_outstanding || 0) > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                      Due: ₹{Number(c.total_outstanding).toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                      Clear
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[#71717A] flex items-center gap-2 mt-0.5">
                                  <span>📱 {c.phone}</span>
                                  {c.address && <span>• {c.address}</span>}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-[#C49A6C] shrink-0">Select →</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-stone-500">
                            No existing customer found matching "{customer.name}".
                          </div>
                        )}

                        {/* Direct Option to fill as New Customer */}
                        {customer.name && (
                          <div
                            onClick={() => {
                              setSelectedCustomerId(null);
                              setSelectedCustomerDue(0);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className="p-2.5 bg-emerald-50/60 hover:bg-emerald-100/70 cursor-pointer text-xs font-bold text-emerald-900 border-t border-emerald-200 flex items-center justify-between sticky bottom-0"
                          >
                            <span>+ Proceed as New Customer: "<strong>{customer.name}</strong>"</span>
                            <span className="text-[10px] uppercase font-extrabold text-emerald-700">Fill Details Below ↓</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="10-digit mobile"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Showroom Delivery Address</label>
              <input
                type="text"
                placeholder="Area, Street, City"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
              />
            </div>
          </div>
        </div>

        {/* Product Selection Rows */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#211F1C]">Invoice Product Items</h3>
              <p className="text-[11px] text-[#71717A]">
                Search showroom items by name, category, or code to add to bill
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEE6DB] hover:bg-[#C49A6C] hover:text-[#211F1C] text-[#211F1C] text-xs font-bold transition-all shadow-xs"
            >
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          {/* ── Top Quick Showroom Search & Add Bar ── */}
          <div className="relative mb-4" ref={quickProductRef}>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
              <input
                type="text"
                placeholder="🔍 Quick Search Showroom Stock: Type product name, category (e.g. Chair, Almirah), or code to add directly..."
                value={quickProductSearch}
                onFocus={() => setIsQuickProductDropdownOpen(true)}
                onChange={(e) => {
                  setQuickProductSearch(e.target.value);
                  setIsQuickProductDropdownOpen(true);
                }}
                className="w-full pl-10 pr-9 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
              />
              {quickProductSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickProductSearch('');
                    setIsQuickProductDropdownOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Showroom Search Results Dropdown */}
            {isQuickProductDropdownOpen && quickProductSearch.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E5E2DE] shadow-2xl z-40 max-h-72 overflow-y-auto divide-y divide-gray-100">
                {(() => {
                  const q = quickProductSearch.trim().toLowerCase();
                  const matched = products.filter(p =>
                    (p.product_name || '').toLowerCase().includes(q) ||
                    (p.category_name || p.category || '').toLowerCase().includes(q) ||
                    (p.product_code || '').toLowerCase().includes(q)
                  );

                  if (matched.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-stone-500">
                        No showroom items found matching "<strong>{quickProductSearch}</strong>".
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="p-2 bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-stone-600 flex justify-between items-center sticky top-0">
                        <span>Matching Showroom Items ({matched.length})</span>
                        <span className="text-[9px] text-[#C49A6C]">Click to add to bill</span>
                      </div>
                      {matched.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleQuickAddProduct(p)}
                          className="p-2.5 hover:bg-[#F7F5F0] cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 font-bold text-xs shrink-0 border border-stone-200">
                              <Package size={16} />
                            </div>
                            <div>
                              <div className="font-bold text-[#211F1C] flex items-center gap-2">
                                <span>{p.product_name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#C49A6C]/20 text-[#211F1C] border border-[#C49A6C]/30">
                                  {p.category_name || p.category || 'Furniture'}
                                </span>
                              </div>
                              <div className="text-[10px] text-stone-500 mt-0.5 flex items-center gap-2">
                                {p.product_code && <span className="font-mono">{p.product_code}</span>}
                                <span>• Live Stock: <strong className={p.available_quantity <= 5 ? 'text-amber-700' : 'text-emerald-700'}>{p.available_quantity} {p.unit || 'PCS'}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-sm text-[#211F1C] block">₹{Number(p.selling_price || 0).toLocaleString('en-IN')}</span>
                            <span className="text-[10px] font-bold text-emerald-700">+ Click to Add</span>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const selectedProd = products.find(p => String(p.id) === String(item.product_id));
              const isStockExceeded = selectedProd && Number(item.quantity) > Number(selectedProd.available_quantity);

              const purchasePrice = Number(selectedProd?.purchase_price || item.purchase_price || 0);
              const qty = Math.max(1, Number(item.quantity || 1));
              const unitPrice = Number(item.unit_price || 0);
              const itemDiscount = Number(item.discount || 0);

              const netLineTotal = (qty * unitPrice) - itemDiscount;
              const effectiveRate = qty > 0 ? (netLineTotal / qty) : 0;

              const isBelowCost = purchasePrice > 0 && effectiveRate < purchasePrice;
              const rateDiff = isBelowCost ? (purchasePrice - effectiveRate) : 0;
              const totalLoss = rateDiff * qty;

              return (
                <div key={idx} className={`p-3 rounded-xl border space-y-2 transition-all ${
                  isBelowCost ? 'bg-amber-50/40 border-amber-300' : 'bg-[#FAF8F5] border-[#E5E2DE]'
                }`}>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Searchable Showroom Item Picker */}
                    <div className="col-span-12 sm:col-span-4 relative" ref={el => itemRowRefs.current[idx] = el}>
                      <label className="block text-[9px] font-bold text-[#A39E98] uppercase mb-1">
                        Select Showroom Item *
                      </label>

                      {activeItemRowSearchIdx === idx ? (
                        <div className="relative">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search item name, category, or code..."
                            value={rowSearchQueries[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRowSearchQueries(prev => ({ ...prev, [idx]: val }));
                            }}
                            className="w-full px-2.5 py-2 bg-white rounded-lg border-2 border-[#C49A6C] text-xs font-semibold focus:outline-none pr-7 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setActiveItemRowSearchIdx(-1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700"
                          >
                            <X size={14} />
                          </button>

                          {/* Row Dropdown Results */}
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E5E2DE] shadow-2xl z-40 max-h-60 overflow-y-auto divide-y divide-gray-100">
                            {(() => {
                              const q = (rowSearchQueries[idx] || '').trim().toLowerCase();
                              const filtered = q
                                ? products.filter(p =>
                                    (p.product_name || '').toLowerCase().includes(q) ||
                                    (p.category_name || p.category || '').toLowerCase().includes(q) ||
                                    (p.product_code || '').toLowerCase().includes(q)
                                  )
                                : products;

                              if (filtered.length === 0) {
                                return (
                                  <div className="p-3 text-center text-xs text-stone-500">
                                    No item found matching "{rowSearchQueries[idx]}".
                                  </div>
                                );
                              }

                              return filtered.map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => handleSelectProductForRow(idx, p)}
                                  className="p-2 hover:bg-[#F7F5F0] cursor-pointer transition-colors flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-[#211F1C] flex items-center gap-1.5">
                                      <span>{p.product_name}</span>
                                      <span className="text-[9px] px-1 rounded bg-[#C49A6C]/20 text-[#211F1C]">
                                        {p.category_name || p.category || 'Item'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-stone-500 mt-0.5">
                                      Stock: <strong className={p.available_quantity <= 5 ? 'text-amber-700' : 'text-emerald-700'}>{p.available_quantity} {p.unit || 'PCS'}</strong>
                                      {p.product_code && <span className="ml-1.5 font-mono">({p.product_code})</span>}
                                    </div>
                                  </div>
                                  <span className="font-black text-xs text-[#211F1C]">
                                    ₹{Number(p.selling_price || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setActiveItemRowSearchIdx(idx);
                            setRowSearchQueries(prev => ({ ...prev, [idx]: '' }));
                          }}
                          className={`w-full px-2.5 py-2 bg-white rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all hover:border-[#C49A6C] ${
                            item.product_id ? 'border-[#C49A6C]/50 text-[#211F1C]' : 'border-[#E5E2DE] text-stone-400'
                          }`}
                        >
                          <div className="truncate pr-2">
                            {selectedProd ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[#211F1C] truncate">{selectedProd.product_name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#C49A6C]/20 text-[#211F1C] shrink-0">
                                  {selectedProd.category_name || selectedProd.category || 'Item'}
                                </span>
                              </div>
                            ) : (
                              <span>🔍 Click to search showroom item...</span>
                            )}
                          </div>
                          <Search size={14} className="text-[#A39E98] shrink-0" />
                        </div>
                      )}
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[9px] font-bold text-[#A39E98] uppercase mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedProd ? selectedProd.available_quantity : 9999}
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className={`w-full px-2.5 py-2 bg-white rounded-lg border text-xs text-center font-bold ${
                          isStockExceeded ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-[#E5E2DE]'
                        }`}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] font-bold text-[#A39E98] uppercase">Selling Rate</label>
                        {purchasePrice > 0 && (
                          <span className="text-[9px] text-stone-500 font-semibold" title={`Purchase Cost: ₹${purchasePrice}`}>
                            Cost: ₹{purchasePrice}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className={`w-full px-2.5 py-2 bg-white rounded-lg border text-xs font-bold transition-all ${
                          isBelowCost ? 'border-amber-500 bg-amber-50 text-amber-950 font-black' : 'border-[#E5E2DE]'
                        }`}
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[9px] font-bold text-[#A39E98] uppercase mb-1">Discount (₹)</label>
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                        className={`w-full px-2.5 py-2 bg-white rounded-lg border text-xs transition-all ${
                          isBelowCost ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold' : 'border-[#E5E2DE]'
                        }`}
                      />
                    </div>

                    <div className="col-span-10 sm:col-span-1 text-right">
                      <label className="block text-[9px] font-bold text-[#A39E98] uppercase mb-1">Line Total</label>
                      <span className="text-xs font-bold text-[#211F1C] block py-2">
                        ₹{((item.quantity * item.unit_price) - item.discount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Category & Live Stock Badge */}
                  {selectedProd && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5E2DE]/60 text-[11px]">
                      <span className="px-2 py-0.5 rounded font-extrabold bg-[#C49A6C]/20 text-[#211F1C] border border-[#C49A6C]/40">
                        Category: {selectedProd.category_name || 'General Furniture'}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${selectedProd.available_quantity <= 5 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                        Current Live Stock: {selectedProd.available_quantity} {selectedProd.unit || 'PCS'}
                      </span>
                      {purchasePrice > 0 && (
                        <span className="px-2 py-0.5 rounded font-extrabold bg-stone-100 text-stone-800 border border-stone-200">
                          Purchase Price: ₹{purchasePrice.toLocaleString('en-IN')}
                        </span>
                      )}
                      {isStockExceeded && (
                        <span className="px-2 py-0.5 rounded font-black bg-rose-100 text-rose-700 animate-pulse flex items-center gap-1">
                          <AlertCircle size={12} /> Stock Alert: Only {selectedProd.available_quantity} available in showroom!
                        </span>
                      )}
                    </div>
                  )}

                  {/* Live Discount Alert: Shows Purchase Price and how much is reduced */}
                  {isBelowCost && (
                    <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl flex flex-wrap items-center justify-between gap-3 text-amber-950 shadow-xs animate-pulse mt-2">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-amber-950 uppercase tracking-wide">
                              ⚠️ DISCOUNT ALERT: Selling Below Purchase Cost!
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-black border border-amber-300">
                              ₹{rateDiff.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Below Cost
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-900 mt-1 leading-snug">
                            Item Purchase Cost: <strong className="text-black font-extrabold underline">₹{purchasePrice.toLocaleString('en-IN')}</strong>. 
                            Current net selling rate after discount: <strong className="text-rose-700 font-extrabold">₹{effectiveRate.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong> 
                            (<strong className="text-rose-700 font-black">₹{rateDiff.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong> below purchase cost per unit - margin loss!).
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/90 border border-amber-300 px-3 py-1.5 rounded-lg text-right shrink-0">
                        <span className="block text-[9px] font-bold text-amber-800 uppercase">Line Margin Loss</span>
                        <span className="text-sm font-black text-rose-700">-₹{totalLoss.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Split & EMI Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Payment Reconciliation (Partial Udhar, Pure Udhar, Full Paid, Custom, EMI) */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle space-y-4">
            <div className="flex flex-col gap-2 pb-2 border-b border-[#E5E2DE]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#211F1C]">Payment Reconciliation &amp; Settlement</h3>
                  <p className="text-[11px] text-[#71717A]">Choose settlement mode: Partial payment with balance due, 100% credit sale, or full payment</p>
                </div>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#F7F5F0] p-1.5 rounded-xl border border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentPreset('PARTIAL_PAY');
                    if (cashAmount === 0 && upiAmount === 0 && grandTotal > 0) {
                      setCashAmount(Math.round(grandTotal / 2));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    paymentPreset === 'PARTIAL_PAY'
                      ? 'bg-[#211F1C] text-white shadow-xs'
                      : 'text-[#71717A] hover:bg-[#EEE6DB]'
                  }`}
                >
                  <Banknote size={14} className="text-amber-400" />
                  <span>Partial Payment (Balance Due)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentPreset('PURE_UDHAR');
                    setCashAmount(0);
                    setUpiAmount(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    paymentPreset === 'PURE_UDHAR'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <AlertCircle size={14} />
                  <span>100% Credit Sale (Khata)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentPreset('FULL_PAID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    paymentPreset === 'FULL_PAID'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>Full Payment Received</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentPreset('CUSTOM')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    paymentPreset === 'CUSTOM'
                      ? 'bg-[#211F1C] text-white shadow-xs'
                      : 'text-[#71717A] hover:bg-[#EEE6DB]'
                  }`}
                  title="Advanced custom split methods"
                >
                  More
                </button>
              </div>
            </div>

            {/* PRESET 1: Partial Payment + Balance Due */}
            {paymentPreset === 'PARTIAL_PAY' && (
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-amber-200">
                  <span className="text-xs font-extrabold text-[#211F1C] flex items-center gap-1.5">
                    <Split size={14} className="text-amber-700" />
                    <span>Customer Advance / Partial Payment</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFiftyFiftySplit}
                      className="px-2 py-1 rounded bg-[#211F1C] text-white text-[10px] font-bold hover:bg-[#C49A6C] transition-all"
                    >
                      50/50 Split
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCashAmount(0); setUpiAmount(0); }}
                      className="px-2 py-1 rounded bg-stone-200 text-stone-800 text-[10px] font-bold hover:bg-stone-300 transition-all"
                    >
                      Reset 0
                    </button>
                  </div>
                </div>

                {/* Cash & UPI Inputs - Independent freely editable */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Cash Box */}
                  <div className="p-3 bg-white rounded-xl border border-[#E5E2DE] shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-[#211F1C] flex items-center gap-1">
                        <Banknote size={14} className="text-emerald-700" />
                        <span>Cash Paid (₹)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setCashAmount(Math.max(0, grandTotal - Number(upiAmount || 0)))}
                        className="text-[10px] text-[#C49A6C] font-bold hover:underline"
                      >
                        Fill Remainder
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={cashAmount === 0 ? '' : cashAmount}
                      onChange={(e) => handleCashAmountChange(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F5F0] rounded-lg border border-[#E5E2DE] text-sm font-bold text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>

                  {/* UPI Box */}
                  <div className="p-3 bg-white rounded-xl border border-[#E5E2DE] shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold text-[#211F1C] flex items-center gap-1">
                        <QrCode size={14} className="text-blue-700" />
                        <span>UPI / QR Paid (₹)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUpiAmount(Math.max(0, grandTotal - Number(cashAmount || 0)))}
                        className="text-[10px] text-[#C49A6C] font-bold hover:underline"
                      >
                        Fill Remainder
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={upiAmount === 0 ? '' : upiAmount}
                      onChange={(e) => handleUpiAmountChange(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F7F5F0] rounded-lg border border-[#E5E2DE] text-sm font-bold text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>
                </div>

                {/* Optional UPI Ref */}
                {Number(upiAmount) > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase shrink-0">UPI Ref / UTR:</span>
                    <input
                      type="text"
                      placeholder="Transaction ID / UTR (Optional)"
                      value={upiRefNo}
                      onChange={(e) => setUpiRefNo(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                    />
                  </div>
                )}

                {/* Live Settlement Display */}
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Grand Total:</span>
                    <span className="font-bold text-stone-900">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Total Paid Now:</span>
                    <span className="font-bold">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                    <span className="font-extrabold text-rose-700 flex items-center gap-1">
                      <AlertCircle size={14} /> Balance Due (Credit):
                    </span>
                    <span className="font-extrabold text-sm text-rose-700">
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {remainingBalance > 0 && (
                    <p className="text-[10px] text-rose-600 italic pt-1">
                      * Remaining balance will be recorded as credit due on invoice and customer ledger.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* PRESET 2: 100% Full Credit Sale (On Account) */}
            {paymentPreset === 'PURE_UDHAR' && (
              <div className="p-4 bg-rose-50 rounded-xl border-2 border-rose-300 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                  <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-rose-600" />
                    <span>100% Credit Sale (On Account)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-extrabold text-[10px]">
                    CREDIT SALE
                  </span>
                </div>

                <p className="text-xs text-rose-800">
                  No upfront cash/UPI collected today. Total invoice value will be recorded on customer account ledger.
                </p>

                <div className="grid grid-cols-3 gap-2 text-center p-3 bg-white rounded-lg border border-rose-200">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Total Invoice Value</span>
                    <strong className="text-xs text-stone-800">₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Paid Today</span>
                    <strong className="text-xs text-stone-800">₹0.00</strong>
                  </div>
                  <div className="bg-rose-100/70 p-1 rounded">
                    <span className="text-[10px] text-rose-700 font-bold block">Credit Balance Due</span>
                    <strong className="text-xs text-rose-700 font-black">₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <p className="text-[10.5px] text-rose-700 italic">
                  * Invoice will be marked as "100% CREDIT SALE" with customer credit acceptance signature.
                </p>
              </div>
            )}

            {/* PRESET 3: Full Payment */}
            {paymentPreset === 'FULL_PAID' && (
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> 100% Full Payment Received
                  </span>
                  <span className="font-serif font-extrabold text-sm text-emerald-900">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Submode Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFullPaidSubmode('CASH')}
                    className={`p-2 rounded-lg text-xs font-bold text-center border transition-all ${
                      fullPaidSubmode === 'CASH'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100/50'
                    }`}
                  >
                    100% Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullPaidSubmode('UPI')}
                    className={`p-2 rounded-lg text-xs font-bold text-center border transition-all ${
                      fullPaidSubmode === 'UPI'
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-100/50'
                    }`}
                  >
                    100% UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullPaidSubmode('SPLIT_50_50')}
                    className={`p-2 rounded-lg text-xs font-bold text-center border transition-all ${
                      fullPaidSubmode === 'SPLIT_50_50'
                        ? 'bg-[#211F1C] text-white border-[#211F1C] shadow-xs'
                        : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    50/50 Cash + UPI
                  </button>
                </div>

                {/* Optional UPI Ref */}
                {(fullPaidSubmode === 'UPI' || fullPaidSubmode === 'SPLIT_50_50') && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                      UPI Ref / UTR No. (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI-9876543210"
                      value={upiRefNo}
                      onChange={(e) => setUpiRefNo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-emerald-200 text-xs focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-emerald-800 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-extrabold">₹0.00 (NIL - Full Paid)</span>
                </div>
              </div>
            )}

            {/* PRESET 4: Custom Multiple Split */}
            {paymentPreset === 'CUSTOM' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-[#211F1C]">Custom Split Methods</span>
                  <button
                    type="button"
                    onClick={addPaymentMethod}
                    className="text-xs font-bold text-[#C49A6C] hover:underline"
                  >
                    + Add Method
                  </button>
                </div>
                {payments.map((p, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2 p-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE]">
                    <select
                      value={p.mode}
                      onChange={(e) => handlePaymentChange(pIdx, 'mode', e.target.value)}
                      className="px-2 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs font-bold"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="ONLINE">ONLINE / CARD</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    </select>

                    <div className="flex-1">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={p.amount || ''}
                        onChange={(e) => handlePaymentChange(pIdx, 'amount', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs font-bold"
                      />
                    </div>

                    {p.mode !== 'CASH' && (
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="UTR / Ref #"
                          value={p.transaction_id || ''}
                          onChange={(e) => handlePaymentChange(pIdx, 'transaction_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E5E2DE] text-xs"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fillRemainingPayment(pIdx)}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-[#211F1C] text-[10px] font-bold rounded"
                      title="Fill remaining balance into this payment"
                    >
                      Fill
                    </button>

                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePaymentMethod(pIdx)}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Customer EMI Option Toggle */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmiSale}
                  onChange={(e) => setIsEmiSale(e.target.checked)}
                  className="w-4 h-4 text-[#C49A6C] rounded"
                />
                <span className="font-bold text-xs text-purple-900">
                  Finance Remaining Balance via Customer EMI
                </span>
              </label>

              {isEmiSale && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">Tenure (Months)</label>
                    <select
                      value={emiPlan.months}
                      onChange={(e) => setEmiPlan({ ...emiPlan, months: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-purple-300 text-xs font-bold"
                    >
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                      <option value={9}>9 Months</option>
                      <option value={12}>12 Months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-purple-800 uppercase mb-1">Est. Monthly Installment</label>
                    <p className="px-3 py-1.5 bg-purple-100 text-purple-900 font-serif font-bold text-xs rounded-lg">
                      ₹{monthlyInstallment.toLocaleString('en-IN')}/mo
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Invoice Summary & Totals */}
          <div className="bg-[#211F1C] text-white p-6 rounded-2xl shadow-premium flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-white border-b border-white/10 pb-3 mb-4">
                Grand Bill Summary
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#A39E98]">
                  <span>Subtotal:</span>
                  <span className="text-white font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                {/* Overall Bill Discount */}
                {canGiveDiscount && (
                  <div className="flex items-center justify-between text-xs py-1 border-t border-white/10">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <span>Overall Bill Discount:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-amber-300 text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discountOverall === 0 ? '' : discountOverall}
                        onChange={(e) => setDiscountOverall(Math.max(0, Number(e.target.value || 0)))}
                        className="w-24 px-2 py-1 bg-white/10 text-white rounded border border-white/20 text-right text-xs font-bold focus:outline-none focus:border-[#C49A6C]"
                      />
                    </div>
                  </div>
                )}

                {invoiceType === 'TAX_INVOICE' && (
                  <>
                    <div className="flex justify-between text-[#A39E98]">
                      <span>CGST (9%):</span>
                      <span className="text-white">₹{cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[#A39E98]">
                      <span>SGST (9%):</span>
                      <span className="text-white">₹{sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-base font-extrabold text-[#C49A6C] pt-3 border-t border-white/10">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>

                {/* Overall Loss Alert */}
                {isOverallBillLoss && (
                  <div className="p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-200 text-xs space-y-1 mt-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>⚠️ High Overall Discount Alert!</span>
                    </div>
                    <p className="text-[11px] text-white/90">
                      Total Purchase Cost: ₹{totalBillCogs.toLocaleString('en-IN')} | Net Selling: ₹{taxable.toLocaleString('en-IN')} (<strong className="text-rose-400 font-extrabold">₹{overallBillLossDiff.toLocaleString('en-IN')} below cost</strong>)
                    </p>
                  </div>
                )}

                <div className="flex justify-between text-xs text-emerald-400 pt-2">
                  <span>Total Paid Now:</span>
                  <span>₹{totalPaid.toLocaleString('en-IN')}</span>
                </div>
                {remainingBalance > 0 ? (
                  <div className="flex justify-between text-xs text-rose-400 font-extrabold bg-rose-950/50 p-2.5 rounded-xl border border-rose-500/40 mt-2">
                    <span>⚠️ BALANCE DUE (CREDIT):</span>
                    <span className="text-sm">₹{remainingBalance.toLocaleString('en-IN')}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs text-emerald-400 font-bold pt-1">
                    <span>Balance Due:</span>
                    <span>₹0.00 (Full Paid)</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full py-3 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] font-extrabold text-sm rounded-xl transition-all shadow-gold-glow flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              {submitting ? 'Generating Invoice & Deducting Stock...' : 'Confirm Sale & Generate Bill'}
            </button>
          </div>
        </div>
      </form>

      {/* Price Alert Confirmation Modal */}
      {priceAlertModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-amber-500 text-stone-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-stone-900" />
                <h3 className="font-serif font-black text-sm uppercase tracking-wide">
                  Discount &amp; Purchase Cost Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPriceAlertModal({ isOpen: false, warnings: [], isOverallLoss: false, overallLoss: 0 })}
                className="p-1 rounded-lg hover:bg-amber-600 text-stone-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950">
                <p className="font-bold">
                  ⚠️ Warning: You have set rates/discounts below the purchase cost for the following items:
                </p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {priceAlertModal.warnings.map((w, wIdx) => (
                  <div key={wIdx} className="p-3 bg-[#FAF8F5] rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-stone-900">
                      <span>{w.product_name} ({w.qty} pcs)</span>
                      <span className="text-rose-700 font-extrabold">-₹{w.total_loss.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Loss</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-stone-200 text-stone-600">
                      <div>
                        <span className="block text-[9px] uppercase font-bold">Purchase Cost</span>
                        <strong className="text-stone-900 font-extrabold">₹{w.purchase_price.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold">Net Selling Rate</span>
                        <strong className="text-amber-900 font-extrabold">₹{w.net_rate.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold">Below Cost</span>
                        <strong className="text-rose-700 font-black">₹{w.diff.toLocaleString('en-IN', { maximumFractionDigits: 1 })} below</strong>
                      </div>
                    </div>
                  </div>
                ))}

                {priceAlertModal.isOverallLoss && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800">
                    <strong>Overall Bill Loss:</strong> Total net invoice amount is <strong>₹{priceAlertModal.overallLoss?.toLocaleString('en-IN')} below</strong> total purchase cost.
                  </div>
                )}
              </div>

              <p className="text-[11px] text-stone-600 italic">
                Do you want to review and fix the discount, or confirm and generate the bill anyway?
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setPriceAlertModal({ isOpen: false, warnings: [], isOverallLoss: false, overallLoss: 0 })}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-all"
                >
                  Review &amp; Fix Discount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceAlertModal({ isOpen: false, warnings: [], isOverallLoss: false, overallLoss: 0 });
                    handleSubmit(null, true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 text-xs font-black transition-all shadow-xs"
                >
                  Confirm &amp; Generate Bill Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant Print Modal after successful creation */}
      {createdSale && (
        <PrintInvoiceModal
          sale={createdSale}
          isOpen={!!createdSale}
          onClose={() => {
            setCreatedSale(null);
            navigate('/sales');
          }}
        />
      )}

      {/* Quick Add Customer Modal */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-[#C49A6C]" />
                <h3 className="font-serif text-sm font-bold text-white">Quick Add Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCustomerOpen(false)}
                className="text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickCustomerSubmit} className="p-5 space-y-3">
              {quickCustError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>{quickCustError}</span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mohammad Imran"
                  value={quickCustForm.name}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">10-Digit Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="9876543210"
                  value={quickCustForm.phone}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Delivery Address</label>
                <input
                  type="text"
                  placeholder="Street / Area"
                  value={quickCustForm.address}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E5E2DE] text-xs font-semibold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#211F1C] hover:bg-[#C49A6C] text-white hover:text-[#211F1C] text-xs font-bold transition-all"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateBill;


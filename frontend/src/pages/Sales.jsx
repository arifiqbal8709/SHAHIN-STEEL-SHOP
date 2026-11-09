import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Printer, CheckCircle, CreditCard, Filter, Trash2, Edit3, Save, X } from 'lucide-react';
import { salesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PrintInvoiceModal from '../components/PrintInvoiceModal';

const Sales = () => {
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSale, setSelectedSale] = useState(null);

  // Edit Sale Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSaleData, setEditSaleData] = useState({
    invoice_number: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    invoice_type: 'TAX_INVOICE',
    amount_paid: '',
    grand_total: 0,
    balance_amount: 0,
    payment_type: 'FULL_PAID',
    discount_overall: 0,
    notes: ''
  });

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await salesAPI.getAll();
      if (res && res.data) {
        setSales(res.data);
        setFilteredSales(res.data);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
    window.addEventListener('shahin-cloud-sync', loadSales);
    return () => window.removeEventListener('shahin-cloud-sync', loadSales);
  }, []);

  const handleDeleteSale = async (s) => {
    if (!window.confirm(`Are you sure you want to delete Invoice #${s.invoice_number} (${s.customer_name})? This will permanently remove the sale and restore stock.`)) return;
    try {
      const res = await salesAPI.delete(s.invoice_number);
      if (res && res.success) {
        loadSales();
      } else {
        alert(res?.message || 'Failed to delete sale');
      }
    } catch (err) {
      alert('Error deleting sale: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllSales = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL sales invoices? All sales records, payments, and invoice entries will be permanently removed!')) return;
    try {
      const res = await salesAPI.deleteAll();
      if (res && res.success) {
        alert('All sales invoices have been cleared successfully!');
        loadSales();
      } else {
        alert(res?.message || 'Failed to clear sales');
      }
    } catch (err) {
      alert('Error clearing sales: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenEditModal = (s) => {
    setEditSaleData({
      invoice_number: s.invoice_number,
      customer_name: s.customer_name || '',
      customer_phone: s.customer_phone || '',
      customer_address: s.customer_address || '',
      invoice_type: s.invoice_type || 'TAX_INVOICE',
      amount_paid: s.amount_paid !== undefined ? s.amount_paid : '',
      grand_total: s.grand_total || 0,
      balance_amount: s.balance_amount || 0,
      payment_type: s.payment_type || 'FULL_PAID',
      discount_overall: s.discount_overall || 0,
      notes: s.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleEditSaleSubmit = async (e) => {
    e.preventDefault();
    if (!editSaleData.invoice_number) return;
    try {
      const res = await salesAPI.update(editSaleData.invoice_number, {
        customer_name: editSaleData.customer_name.trim(),
        customer_phone: editSaleData.customer_phone.trim(),
        customer_address: editSaleData.customer_address.trim(),
        invoice_type: editSaleData.invoice_type,
        amount_paid: Number(editSaleData.amount_paid || 0),
        payment_type: editSaleData.payment_type,
        discount_overall: Number(editSaleData.discount_overall || 0),
        notes: editSaleData.notes
      });
      if (res && res.success) {
        setIsEditModalOpen(false);
        const updated = res.data || res.sale;
        if (updated) {
          setSales(prev => prev.map(s => (s.invoice_number === editSaleData.invoice_number ? { ...s, ...updated } : s)));
        }
        await loadSales();
      } else {
        alert(res?.message || 'Failed to update invoice');
      }
    } catch (err) {
      alert('Error updating invoice: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    let result = sales;
    if (statusFilter !== 'ALL') {
      result = result.filter(s => s.payment_type === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.invoice_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.customer_phone && s.customer_phone.includes(q))
      );
    }
    setFilteredSales(result);
  }, [search, statusFilter, sales]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">Module 2</span>
          <h1 className="font-serif text-2xl font-extrabold text-[#211F1C] m-0">Sales &amp; Invoices</h1>
          <p className="text-xs text-[#71717A] mt-1">Manage GST Tax Invoices, Retail Bills, and customer sales ledger.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {isOwner() && sales.length > 0 && (
            <button
              onClick={handleClearAllSales}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-subtle shrink-0"
              title="Permanently remove all sales invoices"
            >
              <Trash2 size={15} /> Clear All Invoices
            </button>
          )}
          <button
            onClick={() => navigate('/sales/create')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all shadow-subtle shrink-0"
          >
            <Plus size={16} /> Create Sales Bill
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
          <input
            type="text"
            placeholder="Search invoice number, customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'FULL_PAID', 'PARTIAL_PAID', 'EMI', 'UNPAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                statusFilter === st
                  ? 'bg-[#C49A6C] text-[#211F1C]'
                  : 'bg-[#F7F5F0] text-[#71717A] hover:text-[#211F1C]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Type</th>
                <th>Grand Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Payment Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-xs text-[#71717A]">
                    Loading sales invoices from cloud database...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-xs text-[#71717A]">
                    No invoices matching current filter.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id}>
                    <td className="font-mono text-xs font-bold">{s.invoice_number}</td>
                    <td>
                      <p className="font-bold text-xs text-[#211F1C]">{s.customer_name}</p>
                      <p className="text-[10px] text-[#A39E98]">{s.customer_phone}</p>
                    </td>
                    <td className="text-xs text-[#71717A]">
                      {new Date(s.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className="text-[10px] font-bold text-[#71717A] uppercase">
                        {s.invoice_type === 'ESTIMATE_BILL' ? 'Estimate' : 'Tax Invoice'}
                      </span>
                    </td>
                    <td className="font-bold text-xs text-[#211F1C]">{fmt(s.grand_total)}</td>
                    <td className="font-semibold text-xs text-emerald-700">{fmt(s.amount_paid)}</td>
                    <td className="font-semibold text-xs text-rose-600">{fmt(s.balance_amount)}</td>
                    <td>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        s.payment_type === 'FULL_PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (s.payment_type === 'EMI' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800')
                      }`}>
                        {s.payment_type}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isOwner() && (
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all"
                            title="Edit invoice details"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSale(s)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EEE6DB] hover:bg-[#C49A6C] hover:text-[#211F1C] text-[#211F1C] text-xs font-bold transition-all"
                        >
                          <Printer size={13} /> Print
                        </button>
                        {isOwner() && (
                          <button
                            onClick={() => handleDeleteSale(s)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                            title="Delete invoice"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {isEditModalOpen && editSaleData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-[#E5E2DE] my-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE] mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C49A6C]">Modify Sales Record</span>
                <h3 className="font-serif font-bold text-lg text-[#211F1C]">Edit Invoice #{editSaleData.invoice_number}</h3>
              </div>
              <button onClick={handleCloseEditModal} className="p-1.5 rounded-xl text-[#71717A] hover:bg-[#F7F5F0]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSaleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editSaleData.customer_name}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="Customer Name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    value={editSaleData.customer_phone}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="10-digit mobile"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Invoice Type</label>
                  <select
                    value={editSaleData.invoice_type}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, invoice_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  >
                    <option value="TAX_INVOICE">GST Tax Invoice (18%)</option>
                    <option value="ESTIMATE_BILL">Estimate Bill / Retail Slip</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Delivery / Street Address</label>
                  <input
                    type="text"
                    value={editSaleData.customer_address}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, customer_address: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:border-[#C49A6C] outline-none"
                    placeholder="Address, Sector, City"
                  />
                </div>

                <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] sm:col-span-2 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] text-[#A39E98] uppercase block">Grand Total</span>
                    <strong className="text-base font-serif font-bold text-[#211F1C]">{fmt(editSaleData.grand_total)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#A39E98] uppercase block">Calculated Balance</span>
                    <strong className="text-sm font-bold text-rose-600">
                      {fmt(Math.max(0, Number(editSaleData.grand_total || 0) - Number(editSaleData.amount_paid || 0)))}
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editSaleData.amount_paid}
                    onChange={(e) => {
                      const val = e.target.value;
                      const paidNum = Number(val || 0);
                      const totalNum = Number(editSaleData.grand_total || 0);
                      const bal = Math.max(0, totalNum - paidNum);
                      const autoStatus = bal <= 0 ? 'FULL_PAID' : (paidNum > 0 ? 'PARTIAL_PAID' : 'UNPAID');
                      setEditSaleData(prev => ({
                        ...prev,
                        amount_paid: val,
                        balance_amount: bal,
                        payment_type: autoStatus
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold text-emerald-700 focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Payment Status</label>
                  <select
                    value={editSaleData.payment_type}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, payment_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  >
                    <option value="FULL_PAID">Full Paid</option>
                    <option value="PARTIAL_PAID">Partial Paid</option>
                    <option value="EMI">EMI Financed</option>
                    <option value="UNPAID">Unpaid / Due</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Special Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editSaleData.discount_overall}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, discount_overall: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Remarks / Bill Notes</label>
                  <input
                    type="text"
                    value={editSaleData.notes}
                    onChange={(e) => setEditSaleData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:border-[#C49A6C] outline-none"
                    placeholder="Special instructions or delivery notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#211F1C] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] font-extrabold rounded-xl text-xs shadow-gold-glow flex items-center gap-1.5 transition-all"
                >
                  <Save size={14} /> Update Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedSale && (
        <PrintInvoiceModal
          sale={selectedSale}
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
};

export default Sales;


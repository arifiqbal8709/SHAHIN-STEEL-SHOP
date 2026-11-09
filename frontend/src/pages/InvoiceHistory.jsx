import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  Receipt,
  Printer,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
  CreditCard,
  User,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { salesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PrintInvoiceModal from '../components/PrintInvoiceModal';

const InvoiceHistory = () => {
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await salesAPI.getAll();
      if (res && res.data) {
        setSales(res.data);
      }
    } catch (err) {
      console.error('Failed to load invoice history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    window.addEventListener('shahin-cloud-sync', loadInvoices);
    return () => window.removeEventListener('shahin-cloud-sync', loadInvoices);
  }, []);

  const handleDeleteInvoice = async (invoice) => {
    if (!window.confirm(`Are you sure you want to delete Invoice #${invoice.invoice_number} (${invoice.customer_name})? This will permanently remove the sale and return stock to inventory.`)) return;
    try {
      const res = await salesAPI.delete(invoice.invoice_number);
      if (res && res.success) {
        loadInvoices();
      } else {
        alert(res?.message || 'Failed to delete invoice');
      }
    } catch (err) {
      alert('Error deleting invoice: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllInvoices = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL invoices? All sales records, payments, and invoice entries will be permanently removed!')) return;
    try {
      const res = await salesAPI.deleteAll();
      if (res && res.success) {
        alert('All sales invoices have been cleared successfully!');
        loadInvoices();
      } else {
        alert(res?.message || 'Failed to clear invoices');
      }
    } catch (err) {
      alert('Error clearing invoices: ' + (err.response?.data?.message || err.message));
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
        await loadInvoices();
      } else {
        alert(res?.message || 'Failed to update invoice');
      }
    } catch (err) {
      alert('Error updating invoice: ' + (err.response?.data?.message || err.message));
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (s.invoice_number || '').toLowerCase().includes(q) ||
      (s.customer_name || '').toLowerCase().includes(q) ||
      (s.customer_phone || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (typeFilter === 'FULL_PAID') return s.payment_type === 'FULL_PAID';
    if (typeFilter === 'PARTIAL_PAID') return s.payment_type === 'PARTIAL_PAID';
    if (typeFilter === 'EMI') return s.is_emi_sale || s.payment_type === 'EMI';
    if (typeFilter === 'UNPAID') return s.payment_type === 'UNPAID';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ─── 1. Header Banner ─── */}
      <div className="bg-[#211F1C] text-white p-6 rounded-2xl border border-white/5 shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C49A6C]">
            SHAHIN STEEL FURNITURE • BILL ARCHIVE
          </span>
          <h1 className="font-serif text-2xl font-bold mt-1 text-white">
            Invoice History & Sales Bills
          </h1>
          <p className="text-xs text-[#A39E98] mt-0.5">
            Complete showroom sales ledger, printable tax invoices, and payment tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOwner() && sales.length > 0 && (
            <button
              onClick={handleClearAllInvoices}
              className="px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              title="Delete all sales invoices"
            >
              <Trash2 size={15} /> Clear All Invoices
            </button>
          )}
          <button
            onClick={() => navigate('/sales/create')}
            className="px-4 py-2.5 bg-[#C49A6C] hover:bg-[#B38758] text-[#211F1C] rounded-xl text-xs font-bold transition-all shadow-gold-glow flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} /> Create New Bill
          </button>
        </div>
      </div>

      {/* ─── 2. Search & Filter Bar ─── */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer Name, or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5E2DE] bg-[#FAF8F5] text-xs font-semibold text-[#211F1C] focus:outline-none focus:border-[#C49A6C]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-[#71717A]" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E2DE] text-xs font-semibold text-[#211F1C] bg-[#FAF8F5] focus:outline-none focus:border-[#C49A6C]"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="FULL_PAID">Fully Paid</option>
            <option value="PARTIAL_PAID">Partially Paid</option>
            <option value="EMI">EMI Financed</option>
            <option value="UNPAID">Unpaid / Credit</option>
          </select>
        </div>
      </div>

      {/* ─── 3. Invoices Table ─── */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-[#E5E2DE] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#211F1C]">Confirmed Sales Invoices</h3>
            <p className="text-xs text-[#71717A]">Showing {filteredSales.length} of {sales.length} invoices</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E5E2DE] text-[#71717A] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-center">Staff Rep</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DE]">
              {filteredSales.length > 0 ? (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#211F1C]">
                      {s.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#211F1C]">{s.customer_name}</p>
                      {s.customer_phone && (
                        <p className="text-[10px] text-[#71717A]">{s.customer_phone}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#71717A]">
                      {s.sale_date ? new Date(s.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#FAF8F5] text-[#211F1C] border border-[#E5E2DE] text-[10px] font-mono font-bold">
                        {s.sales_rep_code || s.sales_rep_name || 'Counter'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-[#211F1C]">
                      {fmt(s.grand_total)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-emerald-700">
                      {fmt(s.amount_paid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-rose-600">
                      {fmt(s.balance_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.payment_type === 'FULL_PAID' ? 'bg-emerald-100 text-emerald-800' :
                        s.payment_type === 'EMI' ? 'bg-purple-100 text-purple-800' :
                        s.payment_type === 'PARTIAL_PAID' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.payment_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isOwner() && (
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            title="Edit invoice details"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInvoice(s)}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#C49A6C] hover:text-white border border-[#EEE6DB] text-xs font-semibold text-[#211F1C] transition-colors inline-flex items-center gap-1"
                        >
                          <Printer size={12} /> Print
                        </button>
                        {isOwner() && (
                          <button
                            onClick={() => handleDeleteInvoice(s)}
                            className="p-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                            title="Delete invoice"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#71717A]">
                    No sales invoices found matching your filter criteria.
                  </td>
                </tr>
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

      {/* Printable GST Tax Invoice Modal */}
      {selectedInvoice && (
        <PrintInvoiceModal
          sale={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default InvoiceHistory;


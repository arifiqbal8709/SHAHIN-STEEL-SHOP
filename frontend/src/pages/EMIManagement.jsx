import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Printer, Search, IndianRupee, X, Trash2, Edit3, Save } from 'lucide-react';
import { emiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EmiReceiptModal from '../components/EmiReceiptModal';

const EMIManagement = () => {
  const { isOwner } = useAuth();
  const [emiAccounts, setEmiAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Edit EMI Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEmiData, setEditEmiData] = useState({
    id: null,
    emi_account_number: '',
    invoice_number: '',
    customer_name: '',
    customer_phone: '',
    total_amount: '',
    down_payment: '',
    paid_amount: '',
    remaining_balance: '',
    monthly_installment: '',
    total_months: 6,
    due_day_of_month: 5,
    status: 'ACTIVE',
    notes: ''
  });

  // Payment Recording Modal
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await emiAPI.getAll();
      if (res && res.data) {
        setEmiAccounts(res.data);
        if (res.data.length > 0 && !selectedAccount) {
          setSelectedAccount(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching EMI accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('shahin-cloud-sync', loadData);
    return () => window.removeEventListener('shahin-cloud-sync', loadData);
  }, []);

  const handleDeleteEmiAccount = async (account, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete EMI Account "${account.emi_account_number}" for "${account.customer_name}"? All related installments will be permanently deleted.`)) return;
    try {
      const res = await emiAPI.delete(account.id);
      if (res && res.success) {
        if (selectedAccount?.id === account.id) {
          setSelectedAccount(null);
        }
        loadData();
      } else {
        alert(res?.message || 'Failed to delete EMI account');
      }
    } catch (err) {
      alert('Error deleting EMI account: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllEmi = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL EMI Accounts? This cannot be undone!')) return;
    try {
      const res = await emiAPI.deleteAll();
      if (res && res.success) {
        setSelectedAccount(null);
        alert('All EMI accounts have been cleared successfully!');
        loadData();
      } else {
        alert(res?.message || 'Failed to clear EMI accounts');
      }
    } catch (err) {
      alert('Error clearing EMI accounts: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenEditModal = (account, e) => {
    if (e) e.stopPropagation();
    setEditEmiData({
      id: account.id,
      emi_account_number: account.emi_account_number || '',
      invoice_number: account.invoice_number || '',
      customer_name: account.customer_name || '',
      customer_phone: account.customer_phone || '',
      total_amount: account.total_amount !== undefined ? account.total_amount : '',
      down_payment: account.down_payment !== undefined ? account.down_payment : '',
      paid_amount: account.paid_amount !== undefined ? account.paid_amount : '',
      remaining_balance: account.remaining_balance !== undefined ? account.remaining_balance : '',
      monthly_installment: account.monthly_installment !== undefined ? account.monthly_installment : '',
      total_months: account.total_months || 6,
      due_day_of_month: account.due_day_of_month || 5,
      status: account.status || 'ACTIVE',
      notes: account.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleEditEmiSubmit = async (e) => {
    e.preventDefault();
    if (!editEmiData.id) return;
    try {
      const res = await emiAPI.update(editEmiData.id, {
        customer_name: editEmiData.customer_name.trim(),
        customer_phone: editEmiData.customer_phone.trim(),
        total_amount: Number(editEmiData.total_amount || 0),
        down_payment: Number(editEmiData.down_payment || 0),
        paid_amount: Number(editEmiData.paid_amount || 0),
        remaining_balance: Number(editEmiData.remaining_balance || 0),
        monthly_installment: Number(editEmiData.monthly_installment || 0),
        total_months: Number(editEmiData.total_months || 6),
        due_day_of_month: Number(editEmiData.due_day_of_month || 5),
        status: editEmiData.status,
        notes: editEmiData.notes
      });
      if (res && res.success) {
        setIsEditModalOpen(false);
        const updated = res.data || res.account;
        if (updated) {
          setEmiAccounts(prev => prev.map(a => (a.id === editEmiData.id ? { ...a, ...updated } : a)));
          if (selectedAccount?.id === editEmiData.id) {
            setSelectedAccount(prev => ({ ...prev, ...updated }));
          }
        }
        await loadData();
      } else {
        alert(res?.message || 'Failed to update EMI account');
      }
    } catch (err) {
      alert('Error updating EMI account: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePayInstallment = async (e) => {
    e.preventDefault();
    if (!payingInstallment) return;

    setSubmittingPayment(true);
    try {
      const res = await emiAPI.recordPayment(payingInstallment.id, {
        amount: payingInstallment.installment_amount,
        payment_mode: paymentMode,
        transaction_ref: transactionRef
      });

      if (res && res.success) {
        // Open receipt modal
        setReceiptData({
          installment: {
            ...payingInstallment,
            receipt_number: res.receipt_number,
            payment_mode: paymentMode,
            transaction_ref: transactionRef,
            paid_date: new Date().toISOString().slice(0, 10),
            status: 'PAID'
          },
          customerName: selectedAccount?.customer_name,
          invoiceNumber: selectedAccount?.invoice_number
        });

        setPayingInstallment(null);
        setTransactionRef('');
        loadData();
      } else {
        alert(res.message || 'Payment recording failed.');
      }
    } catch (err) {
      alert('Payment error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const filtered = emiAccounts.filter(acc =>
    acc.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    (acc.customer_phone && acc.customer_phone.includes(search)) ||
    acc.emi_account_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">Module 6</span>
          <h1 className="font-serif text-2xl font-extrabold text-[#211F1C] m-0">Customer EMI Management</h1>
          <p className="text-xs text-[#71717A] mt-1">
            Track showroom customer installment plans, due dates, monthly payments and issue EMI receipts.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isOwner() && emiAccounts.length > 0 && (
            <button
              onClick={handleClearAllEmi}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-subtle shrink-0"
              title="Permanently remove all EMI accounts"
            >
              <Trash2 size={14} /> Clear All EMI
            </button>
          )}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
            <input
              type="text"
              placeholder="Search customer, phone or EMI #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left List (1 col), Right Active EMI Account Details & Schedule (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Accounts List */}
        <div className="space-y-3">
          <h3 className="font-serif font-bold text-sm text-[#211F1C]">Customer EMI Accounts</h3>
          {loading ? (
            <p className="text-xs text-[#71717A] py-8 text-center bg-white p-4 rounded-xl border border-[#E5E2DE]">
              Loading EMI accounts...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-[#71717A] py-8 text-center bg-white p-4 rounded-xl border border-[#E5E2DE]">
              No active EMI accounts found.
            </p>
          ) : (
            filtered.map((acc) => {
              const isSelected = selectedAccount?.id === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#211F1C] text-white border-[#211F1C] shadow-premium'
                      : 'bg-white hover:border-[#C49A6C] border-[#E5E2DE] text-[#211F1C]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#C49A6C]">{acc.emi_account_number}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        acc.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {acc.status}
                      </span>
                      {isOwner() && (
                        <>
                          <button
                            onClick={(e) => handleOpenEditModal(acc, e)}
                            className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-colors"
                            title="Edit EMI terms"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteEmiAccount(acc, e)}
                            className="p-1 rounded hover:bg-rose-500/20 text-rose-500 transition-colors"
                            title="Delete EMI account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h4 className="font-serif font-bold text-sm leading-tight">{acc.customer_name}</h4>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-[#A39E98]' : 'text-[#71717A]'}`}>
                    Phone: {acc.customer_phone}
                  </p>

                  <div className="flex justify-between items-end mt-3 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider block opacity-70">Remaining Due</span>
                      <span className="font-serif font-bold text-sm text-rose-400">{fmt(acc.remaining_balance)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider block opacity-70">Monthly</span>
                      <span className="font-bold">{fmt(acc.monthly_installment)}/mo</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Account Ledger & Installment Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAccount ? (
            <>
              {/* Account Overview Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E2DE] gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#C49A6C]">
                      {selectedAccount.emi_account_number} &bull; Linked Invoice: {selectedAccount.invoice_number}
                    </span>
                    <h2 className="font-serif text-xl font-bold text-[#211F1C] mt-1">
                      {selectedAccount.customer_name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#A39E98] block">
                        Outstanding EMI Balance
                      </span>
                      <span className="font-serif text-2xl font-extrabold text-rose-600">
                        {fmt(selectedAccount.remaining_balance)}
                      </span>
                    </div>
                    {isOwner() && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleOpenEditModal(selectedAccount, e)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all"
                          title="Edit EMI Account"
                        >
                          <Edit3 size={14} /> Edit EMI
                        </button>
                        <button
                          onClick={() => handleDeleteEmiAccount(selectedAccount)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                          title="Delete this EMI account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Total Financed</span>
                    <strong className="text-sm font-bold text-[#211F1C]">{fmt(selectedAccount.total_amount)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Down Payment</span>
                    <strong className="text-sm font-bold text-emerald-700">{fmt(selectedAccount.down_payment)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Paid So Far</span>
                    <strong className="text-sm font-bold text-emerald-700">{fmt(selectedAccount.paid_amount)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Monthly Due Day</span>
                    <strong className="text-sm font-bold text-[#211F1C]">Day {selectedAccount.due_day_of_month || 5} of every month</strong>
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              <div className="bg-white rounded-2xl border border-[#E5E2DE] overflow-hidden shadow-subtle">
                <div className="p-4 border-b border-[#E5E2DE] flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-[#211F1C]">Monthly Installment Schedule</h4>
                  <span className="text-xs text-[#71717A]">
                    {selectedAccount.total_months} Months Tenured Plan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="table-luxury">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due Date</th>
                        <th>Installment (₹)</th>
                        <th>Paid Date</th>
                        <th>Mode</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedAccount.installments || []).map((inst) => {
                        const isPaid = inst.status === 'PAID';
                        return (
                          <tr key={inst.id}>
                            <td className="font-bold text-xs">{inst.installment_number}</td>
                            <td className="text-xs font-semibold">{inst.due_date}</td>
                            <td className="font-bold text-xs">{fmt(inst.installment_amount)}</td>
                            <td className="text-xs text-[#71717A]">{inst.paid_date || '—'}</td>
                            <td className="text-xs font-semibold uppercase">{inst.payment_mode || '—'}</td>
                            <td>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 size={11} /> Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800">
                                  <Clock size={11} /> Pending
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              {isPaid ? (
                                <button
                                  onClick={() => setReceiptData({
                                    installment: inst,
                                    customerName: selectedAccount.customer_name,
                                    invoiceNumber: selectedAccount.invoice_number
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EEE6DB] hover:bg-[#C49A6C] hover:text-[#211F1C] text-[#211F1C] text-[11px] font-bold transition-all"
                                >
                                  <Printer size={12} /> Receipt
                                </button>
                              ) : (
                                <button
                                  onClick={() => setPayingInstallment(inst)}
                                  className="px-3 py-1 rounded bg-[#211F1C] hover:bg-[#C49A6C] hover:text-[#211F1C] text-white text-[11px] font-bold transition-all shadow-subtle"
                                >
                                  Collect Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-[#E5E2DE] text-center text-[#71717A]">
              <p>Select an EMI account from the left list to review schedule and collect payments.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Collect Installment Payment ─── */}
      {payingInstallment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE] mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#211F1C]">Collect EMI Installment</h3>
                <p className="text-xs text-[#71717A]">Installment #{payingInstallment.installment_number} for {selectedAccount?.customer_name}</p>
              </div>
              <button onClick={() => setPayingInstallment(null)} className="p-1 rounded-lg text-[#71717A]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePayInstallment} className="space-y-4">
              <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] flex justify-between items-center">
                <span className="text-xs font-bold text-[#71717A]">Installment Due Amount:</span>
                <span className="font-serif text-lg font-extrabold text-[#211F1C]">
                  {fmt(payingInstallment.installment_amount)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Payment Mode *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash Counter</option>
                  <option value="ONLINE">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                  Transaction / UTR Reference #
                </label>
                <input
                  type="text"
                  placeholder="Optional reference or receipt ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setPayingInstallment(null)}
                  className="px-4 py-2 bg-stone-100 text-[#211F1C] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] rounded-xl text-xs font-extrabold shadow-subtle"
                >
                  {submittingPayment ? 'Recording...' : 'Confirm Payment & Print Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit EMI Account (Owner Only) ─── */}
      {isEditModalOpen && editEmiData && isOwner() && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-[#E5E2DE] my-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE] mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C49A6C]">Owner EMI Control</span>
                <h3 className="font-serif font-bold text-lg text-[#211F1C]">Edit EMI Account #{editEmiData.emi_account_number}</h3>
              </div>
              <button onClick={handleCloseEditModal} className="p-1.5 rounded-xl text-[#71717A] hover:bg-[#F7F5F0]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditEmiSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editEmiData.customer_name}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Customer Phone *</label>
                  <input
                    type="text"
                    required
                    value={editEmiData.customer_phone}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Account Status</label>
                  <select
                    value={editEmiData.status}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Running)</option>
                    <option value="COMPLETED">COMPLETED (Fully Paid)</option>
                    <option value="OVERDUE">OVERDUE (Pending)</option>
                    <option value="DEFAULTED">DEFAULTED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Total Financed Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editEmiData.total_amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const tot = Number(val || 0);
                      const down = Number(editEmiData.down_payment || 0);
                      const paid = Number(editEmiData.paid_amount || 0);
                      setEditEmiData(prev => ({
                        ...prev,
                        total_amount: val,
                        remaining_balance: Math.max(0, tot - down - paid)
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Down Payment (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editEmiData.down_payment}
                    onChange={(e) => {
                      const val = e.target.value;
                      const down = Number(val || 0);
                      const tot = Number(editEmiData.total_amount || 0);
                      const paid = Number(editEmiData.paid_amount || 0);
                      setEditEmiData(prev => ({
                        ...prev,
                        down_payment: val,
                        remaining_balance: Math.max(0, tot - down - paid)
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Paid So Far (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editEmiData.paid_amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const paid = Number(val || 0);
                      const tot = Number(editEmiData.total_amount || 0);
                      const down = Number(editEmiData.down_payment || 0);
                      setEditEmiData(prev => ({
                        ...prev,
                        paid_amount: val,
                        remaining_balance: Math.max(0, tot - down - paid)
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold text-emerald-700 focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Remaining Due Balance (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editEmiData.remaining_balance}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, remaining_balance: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold text-rose-600 focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Monthly Installment (₹/mo) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editEmiData.monthly_installment}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, monthly_installment: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Tenure (Total Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={editEmiData.total_months}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, total_months: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editEmiData.due_day_of_month}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, due_day_of_month: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="e.g. 5"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Remarks / EMI Agreement Notes</label>
                  <input
                    type="text"
                    value={editEmiData.notes}
                    onChange={(e) => setEditEmiData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:border-[#C49A6C] outline-none"
                    placeholder="Guarantor name, cheque details, or agreement notes..."
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
                  <Save size={14} /> Update EMI Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Printable EMI Receipt Modal ─── */}
      {receiptData && (
        <EmiReceiptModal
          installment={receiptData.installment}
          customerName={receiptData.customerName}
          invoiceNumber={receiptData.invoiceNumber}
          isOpen={!!receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
};

export default EMIManagement;


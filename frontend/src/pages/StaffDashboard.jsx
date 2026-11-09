import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  Banknote,
  QrCode,
  Clock,
  CheckCircle2,
  Receipt,
  UserCheck,
  ShoppingCart,
  Users,
  ShieldCheck,
  RefreshCw,
  Zap,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { staffAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PrintInvoiceModal from '../components/PrintInvoiceModal';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [clockMsg, setClockMsg] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Half-Day Leave Modal State
  const [isHalfDayModalOpen, setIsHalfDayModalOpen] = useState(false);
  const [halfDayReason, setHalfDayReason] = useState('Personal Emergency');
  const [submittingHalfDay, setSubmittingHalfDay] = useState(false);

  const fetchStaffData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await staffAPI.getDashboardStats(user?.employee_id);
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error('Error fetching staff dashboard data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData(false);
    const handleSync = () => fetchStaffData(true);
    window.addEventListener('shahin-cloud-sync', handleSync);
    const interval = setInterval(() => fetchStaffData(true), 15000);
    return () => {
      window.removeEventListener('shahin-cloud-sync', handleSync);
      clearInterval(interval);
    };
  }, []);

  const handleCheckIn = async () => {
    setClocking(true);
    setClockMsg('');
    try {
      const res = await attendanceAPI.checkIn({ employee_id: user?.employee_id });
      if (res && res.success) {
        setClockMsg(res.message || 'Checked in successfully!');
        await fetchStaffData();
      } else {
        alert(res?.message || 'Check-in failed.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Check-in error.');
    } finally {
      setClocking(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Are you ready to clock out for your shift?')) return;
    setClocking(true);
    setClockMsg('');
    try {
      const res = await attendanceAPI.checkOut({ employee_id: user?.employee_id });
      if (res && res.success) {
        setClockMsg(res.message || 'Checked out successfully.');
        await fetchStaffData();
      } else {
        alert(res?.message || 'Check-out failed.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Check-out error.');
    } finally {
      setClocking(false);
    }
  };

  const handleConfirmHalfDay = async () => {
    setSubmittingHalfDay(true);
    setClockMsg('');
    try {
      const res = await attendanceAPI.markHalfDay({
        employee_id: user?.employee_id,
        notes: halfDayReason || 'Half Day Leave'
      });
      if (res && res.success) {
        setClockMsg(res.message || 'Half Day Leave recorded successfully. Admin notified.');
        setIsHalfDayModalOpen(false);
        setHalfDayReason('Personal Emergency');
        await fetchStaffData();
      } else {
        alert(res?.message || 'Failed to record half day leave.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Error recording half day leave.');
    } finally {
      setSubmittingHalfDay(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const att = stats?.attendance || {};

  return (
    <div className="space-y-6">
      {/* ─── 1. Staff Showroom Welcome Hero Banner ─── */}
      <div className="relative rounded-2xl overflow-hidden shadow-premium bg-[#211F1C] border border-[#E5E2DE]/30">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: `url('/living-room-hero.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#211F1C] via-[#211F1C]/90 to-transparent" />

        <div className="relative z-10 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C49A6C]/20 border border-[#C49A6C]/30 text-[#C49A6C] text-[10px] font-extrabold uppercase tracking-widest mb-3">
              SHAHIN STEEL FURNITURE • SALES COUNTER
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Welcome back, {user?.name || user?.username || 'Sales Executive'}
            </h1>
            <p className="text-xs text-[#A39E98] mt-1 leading-relaxed">
              Staff ID: <span className="text-[#C49A6C] font-mono font-bold">{user?.employee_code || stats?.staff_code || 'SSF-STAFF'}</span> • {user?.designation || stats?.designation || 'Sales Executive'}
            </p>
          </div>

          {/* Quick Check-in / Shift Clock Widget */}
          <div className="bg-[#1A1917]/90 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 min-w-[320px]">
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  att.status === 'HALF_DAY'
                    ? 'bg-amber-400'
                    : att.has_checked_in && !att.has_checked_out
                    ? 'bg-emerald-500 animate-pulse'
                    : att.status === 'LEAVE'
                    ? 'bg-rose-400'
                    : 'bg-stone-500'
                }`} />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  {att.status === 'HALF_DAY'
                    ? '⚡ Half Day Leave Logged'
                    : att.status === 'LEAVE'
                    ? '✕ On Leave Today'
                    : att.has_checked_in
                    ? (att.has_checked_out ? 'Shift Completed' : 'Clocked In (Active Shift)')
                    : 'Not Checked In'}
                </span>
              </div>
              <p className="text-[11px] text-[#A39E98] truncate">
                {att.status === 'HALF_DAY'
                  ? `Half day credited (4.0 hrs)${att.check_out_time ? ` • Departed: ${att.check_out_time}` : ''}`
                  : att.check_in_time
                  ? `In: ${att.check_in_time}${att.check_out_time ? ` • Out: ${att.check_out_time}` : ''} • ${att.working_hours || 0} hrs`
                  : 'Start shift or record half-day leave'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {att.status === 'HALF_DAY' ? (
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Zap size={13} /> Half Day (4 hrs)
                </span>
              ) : att.status === 'LEAVE' ? (
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5">
                  <Clock size={13} /> On Leave
                </span>
              ) : !att.has_checked_in ? (
                <>
                  <button
                    onClick={handleCheckIn}
                    disabled={clocking}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    title="Start full working shift"
                  >
                    <Clock size={14} />
                    <span>Check In</span>
                  </button>
                  <button
                    onClick={() => setIsHalfDayModalOpen(true)}
                    disabled={clocking}
                    className="px-3.5 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold border border-amber-500/40 shadow-sm transition-all flex items-center gap-1.5"
                    title="Take half day leave today"
                  >
                    <Zap size={14} />
                    <span>Half Day Leave</span>
                  </button>
                </>
              ) : !att.has_checked_out ? (
                <>
                  <button
                    onClick={handleCheckOut}
                    disabled={clocking}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    title="End your full shift"
                  >
                    <Clock size={14} />
                    <span>Check Out</span>
                  </button>
                  <button
                    onClick={() => setIsHalfDayModalOpen(true)}
                    disabled={clocking}
                    className="px-3.5 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold border border-amber-500/40 shadow-sm transition-all flex items-center gap-1.5"
                    title="Clock out early as Half Day Leave"
                  >
                    <Zap size={14} />
                    <span>Half Day Leave</span>
                  </button>
                </>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Shift Completed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Half Day Leave Request / Confirmation Modal */}
      {isHalfDayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-[#E5E2DE] animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#211F1C]">Take Half Day Leave</h3>
                  <p className="text-[10px] text-[#71717A]">आधे दिन की छुट्टी (Logged live to Owner / Admin)</p>
                </div>
              </div>
              <button
                onClick={() => setIsHalfDayModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950">
                <p className="font-bold flex items-center justify-between">
                  <span>Departure Time:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-black font-extrabold">
                    {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
                <p className="text-[11px] text-amber-900 mt-1.5 leading-snug">
                  Your shift will be marked as <strong className="text-black font-extrabold">HALF DAY (4.00 hrs credited)</strong> and your departure reason will immediately show in the Admin section.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1.5">
                  Select Reason for Early Departure / Leave *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {['Doctor / Medical', 'Personal Emergency', 'Urgent Family Work', 'Pre-approved Half Day'].map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() => setHalfDayReason(chip)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all border ${
                        halfDayReason === chip
                          ? 'bg-[#C49A6C] text-[#211F1C] border-[#C49A6C] shadow-xs'
                          : 'bg-[#F7F5F0] text-stone-700 border-[#E5E2DE] hover:border-[#C49A6C]'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows="2"
                  value={halfDayReason}
                  onChange={(e) => setHalfDayReason(e.target.value)}
                  placeholder="Type specific reason for leaving..."
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E2DE]">
              <button
                type="button"
                onClick={() => setIsHalfDayModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHalfDay}
                disabled={submittingHalfDay}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Zap size={14} />
                <span>{submittingHalfDay ? 'Submitting...' : 'Confirm Half Day Leave'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {clockMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{clockMsg}</span>
        </div>
      )}

      {/* ─── 2. Personal KPI Cards (Zero Confidential Owner Financials) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Personal Sales */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Today's Sales</span>
            <div className="w-9 h-9 rounded-xl bg-[#C49A6C]/10 text-[#C49A6C] flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-[#211F1C]">
            {fmt(stats?.today_sales)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#71717A]">
            <Receipt size={13} className="text-[#C49A6C]" />
            <span>{stats?.today_bills_count || 0} Bills Generated Today</span>
          </div>
        </div>

        {/* Products Sold Count */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Products Sold</span>
            <div className="w-9 h-9 rounded-xl bg-[#211F1C]/10 text-[#211F1C] flex items-center justify-center">
              <Package size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-[#211F1C]">
            {stats?.today_products_sold || 0} <span className="text-sm font-sans font-medium text-[#71717A]">units</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 size={13} />
            <span>Steel, Wooden & Plastic Furniture</span>
          </div>
        </div>

        {/* Today's Cash Collection */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Cash Drawer Collection</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Banknote size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-[#211F1C]">
            {fmt(stats?.today_collections?.cash)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#71717A]">
            <span>Physical cash in counter</span>
          </div>
        </div>

        {/* Today's UPI Collection */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C]/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">UPI / QR Collections</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
              <QrCode size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-[#211F1C]">
            {fmt(stats?.today_collections?.upi)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-indigo-700 font-semibold">
            <span>Instant showroom QR receipts</span>
          </div>
        </div>
      </div>

      {/* ─── 3. Quick Action Shortcuts for Staff (Permission Controlled) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {user?.permissions?.can_manage_sales !== false && (
          <button
            onClick={() => navigate('/sales/create')}
            className="p-4 rounded-xl bg-gradient-to-r from-[#211F1C] to-[#36322D] text-white hover:from-[#C49A6C] hover:to-[#B38758] hover:text-[#211F1C] transition-all flex items-center justify-between shadow-subtle group text-left"
          >
            <div>
              <p className="text-xs font-bold">New Sale / Bill</p>
              <p className="text-[10px] text-white/70 group-hover:text-[#211F1C]/80">Create customer tax invoice</p>
            </div>
            <Plus size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {user?.permissions?.can_view_inventory !== false && (
          <button
            onClick={() => navigate('/stock')}
            className="p-4 rounded-xl bg-white border border-[#E5E2DE] text-[#211F1C] hover:border-[#C49A6C] hover:bg-[#F7F5F0] transition-all flex items-center justify-between shadow-subtle group text-left"
          >
            <div>
              <p className="text-xs font-bold">Check Inventory</p>
              <p className="text-[10px] text-[#71717A]">Steel, Wood & Plastic</p>
            </div>
            <Package size={18} className="text-[#C49A6C] shrink-0" />
          </button>
        )}

        {user?.permissions?.can_manage_customers !== false && (
          <button
            onClick={() => navigate('/customers')}
            className="p-4 rounded-xl bg-white border border-[#E5E2DE] text-[#211F1C] hover:border-[#C49A6C] hover:bg-[#F7F5F0] transition-all flex items-center justify-between shadow-subtle group text-left"
          >
            <div>
              <p className="text-xs font-bold">Customers</p>
              <p className="text-[10px] text-[#71717A]">Add or search buyers</p>
            </div>
            <Users size={18} className="text-[#C49A6C] shrink-0" />
          </button>
        )}

        {user?.permissions?.can_collect_emi !== false && (
          <button
            onClick={() => navigate('/emi')}
            className="p-4 rounded-xl bg-white border border-[#E5E2DE] text-[#211F1C] hover:border-[#C49A6C] hover:bg-[#F7F5F0] transition-all flex items-center justify-between shadow-subtle group text-left"
          >
            <div>
              <p className="text-xs font-bold">EMI Collection</p>
              <p className="text-[10px] text-[#71717A]">Collect installment</p>
            </div>
            <CreditCard size={18} className="text-[#C49A6C] shrink-0" />
          </button>
        )}
      </div>

      {/* ─── 4. Main Body: Weekly Personal Performance Chart & Low Stock / Reminders ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Personal Sales Chart (7-day trend) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-bold text-[#211F1C]">My Sales Performance (Last 7 Days)</h3>
              <p className="text-xs text-[#71717A]">Your personal daily sales turnover achieved</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#C49A6C]/10 text-[#C49A6C] text-[10px] font-bold">
              Personal Ledger
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.weekly_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={{ stroke: '#E5E2DE' }} />
                <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={{ stroke: '#E5E2DE' }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Sales']}
                  labelFormatter={(lbl, p) => p?.[0]?.payload?.full_date || lbl}
                  contentStyle={{ backgroundColor: '#211F1C', border: '1px solid #C49A6C', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="amount" fill="#C49A6C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Counter Notifications & Alerts */}
        <div className="space-y-4">
          {/* Shift Details Card */}
          <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#EEE6DB]">
            <h4 className="font-serif text-sm font-bold text-[#211F1C] mb-3 flex items-center gap-2">
              <Clock size={16} className="text-[#C49A6C]" />
              Today's Shift Record
            </h4>
            <div className="space-y-2 text-xs text-[#71717A]">
              <div className="flex justify-between py-1 border-b border-[#EEE6DB]">
                <span>Date:</span>
                <span className="font-bold text-[#211F1C]">{att.date || new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EEE6DB]">
                <span>Check-in Time:</span>
                <span className="font-bold text-emerald-700">{att.check_in_time || 'Pending'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EEE6DB]">
                <span>Check-out Time:</span>
                <span className="font-bold text-[#211F1C]">{att.check_out_time || 'Active on Duty'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Working Hours Logged:</span>
                <span className="font-bold text-[#C49A6C]">{att.working_hours || 0} Hours</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/attendance')}
              className="w-full mt-4 py-2 rounded-xl bg-white border border-[#C49A6C] text-[#211F1C] hover:bg-[#C49A6C] hover:text-white text-xs font-bold transition-all text-center"
            >
              View Full Attendance History
            </button>
          </div>

          {/* Low Stock Alerts for Showroom Advising */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
            <div className="flex items-center gap-2 mb-2 text-amber-700">
              <AlertTriangle size={16} />
              <h4 className="font-serif text-sm font-bold text-[#211F1C]">Inventory Advice</h4>
            </div>
            <p className="text-xs text-[#71717A]">
              There are <strong className="text-amber-800 font-bold">{stats?.low_stock_count || 0}</strong> products running below minimum stock limit. Check availability before confirming bulk deliveries.
            </p>
            <button
              onClick={() => navigate('/stock')}
              className="mt-3 text-xs font-bold text-[#C49A6C] hover:underline flex items-center gap-1"
            >
              Browse Stock Levels <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 5. Recent Sales Made by Me ─── */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-[#E5E2DE] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#211F1C]">My Recent Sales & Bills</h3>
            <p className="text-xs text-[#71717A]">Invoices generated by your account</p>
          </div>
          <button
            onClick={() => navigate('/sales/create')}
            className="px-3.5 py-1.5 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all flex items-center gap-1"
          >
            <Plus size={14} /> New Bill
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E5E2DE] text-[#71717A] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-center">Payment Mode</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DE]">
              {stats?.recent_sales?.length > 0 ? (
                stats.recent_sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#211F1C]">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#211F1C]">{sale.customer_name}</p>
                      {sale.customer_phone && (
                        <p className="text-[10px] text-[#71717A]">{sale.customer_phone}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#71717A]">{sale.date}</td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-[#211F1C]">
                      {fmt(sale.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-emerald-700">
                      {fmt(sale.amount_paid)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        sale.payment_type === 'FULL_PAID' ? 'bg-emerald-100 text-emerald-800' :
                        sale.payment_type === 'EMI' ? 'bg-purple-100 text-purple-800' :
                        sale.payment_type === 'PARTIAL_PAID' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sale.payment_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedInvoice(sale)}
                        className="px-2.5 py-1 rounded-lg bg-[#F7F5F0] hover:bg-[#C49A6C] hover:text-white border border-[#EEE6DB] text-xs font-semibold text-[#211F1C] transition-colors"
                      >
                        Print Bill
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#71717A]">
                    No sales recorded yet today. Click "New Bill" to generate your first sale!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <PrintInvoiceModal
          sale={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default StaffDashboard;


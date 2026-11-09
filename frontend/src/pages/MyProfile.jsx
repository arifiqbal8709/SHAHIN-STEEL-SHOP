import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  Lock,
  Award,
  Sparkles
} from 'lucide-react';
import { staffAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MyProfile = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await staffAPI.getMyProfile();
        if (res) {
          setData(res);
        }
      } catch (err) {
        console.error('Failed to load staff profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const p = data?.profile || {
    name: user?.name || user?.username || 'Sales Staff',
    employee_code: user?.employee_code || 'SSF-EMP-001',
    designation: user?.designation || 'Sales Executive',
    phone: user?.phone || '9876543210',
    email: user?.email || 'staff@shahinsteel.com',
    address: 'Chas, Bokaro / Ranchi, Jharkhand',
    joining_date: '01 January 2025',
    is_active: true,
    permissions: user?.permissions || {}
  };

  const sales = data?.sales_performance || { total_sales: 0, invoices_count: 0 };
  const att = data?.attendance_stats || { present_days_this_month: 0, total_hours_this_month: 0 };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  const permissionLabels = [
    { key: 'can_manage_sales', label: 'Sales & Invoicing', desc: 'Authorized to generate customer sales bills' },
    { key: 'can_print_invoices', label: 'Print Invoices', desc: 'Authorized to print GST tax invoices' },
    { key: 'can_give_discount', label: 'Discount Authorization', desc: 'Permitted to apply sales discounts' },
    { key: 'can_manage_customers', label: 'Customer Directory', desc: 'Can add & update customer profiles' },
    { key: 'can_view_inventory', label: 'Inventory Viewing', desc: 'Browse live stock levels across categories' },
    { key: 'can_view_emi', label: 'EMI Account Access', desc: 'View customer financing plans' },
    { key: 'can_collect_emi', label: 'EMI Installment Collection', desc: 'Collect monthly installments & print receipts' },
    { key: 'can_manage_attendance', label: 'Shift Clocking', desc: 'Check in & check out daily attendance' },
    { key: 'can_adjust_stock', label: 'Stock Adjustment', desc: 'Owner-controlled: Direct inventory modifications' },
    { key: 'can_manage_purchases', label: 'Purchases / Inward', desc: 'Owner-controlled: Factory supplier inward entry' },
    { key: 'can_manage_expenses', label: 'Expense Recording', desc: 'Owner-controlled: Shop operational expenses' },
    { key: 'can_view_reports', label: 'Financial Reports', desc: 'Owner-controlled: Profit & Loss statements' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ─── 1. Showroom Employee Identity Badge ─── */}
      <div className="bg-[#211F1C] text-white rounded-2xl p-6 lg:p-8 border border-white/5 shadow-premium relative overflow-hidden">
        <div
          className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#C49A6C]/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar / Staff Icon */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#C49A6C] to-[#8C6239] p-1 shadow-gold-glow flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-[14px] bg-[#211F1C] flex items-center justify-center text-[#C49A6C] font-serif font-black text-3xl">
              {p.name.charAt(0)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-[#C49A6C]/20 text-[#C49A6C] text-[10px] font-extrabold uppercase tracking-widest border border-[#C49A6C]/30">
                STAFF ID: {p.employee_code}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                p.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {p.is_active ? 'Active Staff' : 'Inactive'}
              </span>
            </div>

            <h1 className="font-serif text-2xl lg:text-3xl font-extrabold text-white">
              {p.name}
            </h1>
            <p className="text-sm text-[#C49A6C] font-semibold mt-0.5">
              {p.designation} • Shahin Steel Furniture Showroom
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-xs text-[#A39E98]">
              {p.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-[#C49A6C]" /> {p.phone}
                </span>
              )}
              {p.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-[#C49A6C]" /> {p.email}
                </span>
              )}
              {p.joining_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#C49A6C]" /> Joined: {p.joining_date}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Personal Statistics Overview ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Lifetime Sales</span>
            <TrendingUp size={16} className="text-[#C49A6C]" />
          </div>
          <p className="text-2xl font-serif font-black text-[#211F1C]">
            {fmt(sales.total_sales)}
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Total revenue closed by you</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Invoices Generated</span>
            <Receipt size={16} className="text-[#211F1C]" />
          </div>
          <p className="text-2xl font-serif font-black text-[#211F1C]">
            {sales.invoices_count || 0}
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Confirmed customer bills</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Shifts This Month</span>
            <Calendar size={16} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-serif font-black text-emerald-700">
            {att.present_days_this_month || 0} <span className="text-sm font-sans font-medium text-[#71717A]">days</span>
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Punctual showroom attendance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Logged Hours</span>
            <Clock size={16} className="text-[#C49A6C]" />
          </div>
          <p className="text-2xl font-serif font-black text-[#C49A6C]">
            {att.total_hours_this_month ? att.total_hours_this_month.toFixed(1) : '0.0'} <span className="text-sm font-sans font-medium text-[#71717A]">hrs</span>
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Current monthly tally</p>
        </div>
      </div>

      {/* ─── 3. Personal Contact & Showroom Address ─── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <h3 className="font-serif text-base font-bold text-[#211F1C] mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EEE6DB]">
            <span className="text-[10px] uppercase font-bold text-[#71717A] block mb-1">Residential Address</span>
            <p className="font-semibold text-[#211F1C]">{p.address || 'Address on file with showroom HR'}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EEE6DB]">
            <span className="text-[10px] uppercase font-bold text-[#71717A] block mb-1">Assigned Counter</span>
            <p className="font-semibold text-[#211F1C]">Main Showroom Floor • Steel & Wooden Section</p>
          </div>
        </div>
      </div>

      {/* ─── 4. Security & Permissions Badge Matrix ─── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-base font-bold text-[#211F1C] flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#C49A6C]" />
              Account Permissions Matrix
            </h3>
            <p className="text-xs text-[#71717A]">Granular security permissions granted by the store owner</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#FAF8F5] text-[#71717A] border border-[#E5E2DE] text-[10px] font-bold flex items-center gap-1">
            <Lock size={11} /> Read-Only
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {permissionLabels.map(({ key, label, desc }) => {
            const hasPerm = Boolean(p.permissions?.[key]);
            return (
              <div
                key={key}
                className={`p-3.5 rounded-xl border transition-all ${
                  hasPerm
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-stone-50/60 border-stone-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#211F1C]">{label}</span>
                  {hasPerm ? (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Granted
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">
                      Restricted
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#71717A] leading-tight">{desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Lock size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>Security Notice:</strong> Salary details, system roles, and granular security authorizations can only be altered by the showroom Owner. If you require higher discount permissions or inventory adjustment privileges, please contact management.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;


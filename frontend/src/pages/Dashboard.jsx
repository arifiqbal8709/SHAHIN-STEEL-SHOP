import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Package,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  Layers,
  Banknote,
  QrCode,
  Globe,
  Clock,
  ShoppingCart,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { dashboardAPI } from '../services/api';
import PrintInvoiceModal from '../components/PrintInvoiceModal';
import StaffDashboard from './StaffDashboard';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  // Admin is one: Only OWNER sees financial metrics, all staff see the Staff Dashboard
  if (user?.role !== 'OWNER') {
    return <StaffDashboard />;
  }

  const navigate = useNavigate();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.getStats(period);
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
    // Listen for cloud sync events across devices
    const handleSync = () => fetchStats();
    window.addEventListener('shahin-cloud-sync', handleSync);
    return () => window.removeEventListener('shahin-cloud-sync', handleSync);
  }, [fetchStats]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN');

  const financialChartData = [
    { name: 'Sales Turnover', amount: stats?.totalSales || 0, fill: '#C49A6C' },
    { name: 'Cost of Goods (COGS)', amount: (stats?.totalSales ? Math.round(stats.totalSales * 0.62) : 0), fill: '#71717A' },
    { name: 'Showroom Expenses', amount: stats?.totalExpenses || 0, fill: '#E11D48' },
    { name: 'Actual Net Profit', amount: stats?.totalProfit || 0, fill: '#059669' },
  ];

  const categoryPieData = [
    { name: 'Steel Items', value: stats?.categorySummary?.['Steel Items'] || 70, color: '#211F1C' },
    { name: 'Wooden Items', value: stats?.categorySummary?.['Wooden Items'] || 26, color: '#C49A6C' },
    { name: 'Plastic Items', value: stats?.categorySummary?.['Plastic Items'] || 133, color: '#D5CEC4' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── 1. Premium Furniture Showroom Hero Banner ─── */}
      <div className="relative rounded-2xl overflow-hidden shadow-premium bg-[#211F1C] border border-[#E5E2DE]/30">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('/living-room-hero.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#211F1C] via-[#211F1C]/90 to-transparent" />

        <div className="relative z-10 p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C49A6C]/20 border border-[#C49A6C]/30 text-[#C49A6C] text-[10px] font-extrabold uppercase tracking-widest mb-3">
              SHAHIN STEEL FURNITURE SHOWROOM • RANCHI
            </span>
            <h1 className="font-serif text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Executive Business Overview
            </h1>
            <p className="text-xs text-[#A39E98] mt-1 leading-relaxed">
              Real-time stock valuation, daily revenue, sales ledger, profit analytics and customer EMI tracking.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/sales/create')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C49A6C] text-[#211F1C] hover:bg-[#dfb76c] font-bold text-xs tracking-wide transition-all shadow-gold-glow"
            >
              <Plus size={16} /> New Sales Bill
            </button>
            <button
              onClick={() => navigate('/stock')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs tracking-wide border border-white/10 transition-all backdrop-blur-sm"
            >
              <Package size={15} /> Update Stock
            </button>
            <button
              onClick={() => navigate('/emi')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs tracking-wide border border-white/10 transition-all backdrop-blur-sm"
            >
              <CreditCard size={15} /> Customer EMI
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Time Period Filter Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[#C49A6C]" />
          <span className="text-xs font-bold text-[#211F1C]">Reporting Period:</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#F7F5F0] p-1 rounded-lg border border-[#E5E2DE]">
          {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                period === p
                  ? 'bg-[#211F1C] text-white shadow-subtle'
                  : 'text-[#71717A] hover:text-[#211F1C]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. Top Core Performance Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A39E98]">Total Sales</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#C49A6C] flex items-center justify-center">
              <IndianRupee size={18} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-[#211F1C]">{fmt(stats?.totalSales)}</p>
          <p className="text-[11px] text-[#71717A] mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <strong>{stats?.salesCount || 0}</strong> invoices generated in {period}
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A39E98]">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Banknote size={18} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-emerald-700">{fmt(stats?.totalRevenue)}</p>
          <p className="text-[11px] text-[#71717A] mt-2">
            Net cash &amp; online collected
          </p>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A39E98]">Net Profit</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-emerald-600">{fmt(stats?.totalProfit)}</p>
          <p className="text-[11px] text-[#71717A] mt-2">
            Gross: {fmt(stats?.grossProfit)} | Exp: {fmt(stats?.totalExpenses)}
          </p>
        </div>

        {/* Total Stock Value */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#A39E98]">Current Stock Value</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-[#211F1C] flex items-center justify-center">
              <Package size={18} />
            </div>
          </div>
          <p className="font-serif text-2xl font-extrabold text-[#211F1C]">{fmt(stats?.totalStockValue)}</p>
          <p className="text-[11px] text-[#71717A] mt-2">
            <strong>{fmtNum(stats?.totalInventoryUnits)}</strong> total units in godown
          </p>
        </div>
      </div>

      {/* ─── 4. Collections Breakdown & EMI Pending ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash Collection */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#C49A6C] flex items-center justify-center shrink-0">
            <Banknote size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#A39E98] uppercase">Cash Collection</p>
            <p className="font-serif text-lg font-bold text-[#211F1C]">{fmt(stats?.cashCollection)}</p>
            <span className="text-[10px] text-[#71717A]">Counter cash drawer</span>
          </div>
        </div>

        {/* UPI Collection */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <QrCode size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#A39E98] uppercase">UPI Collection</p>
            <p className="font-serif text-lg font-bold text-[#211F1C]">{fmt(stats?.upiCollection)}</p>
            <span className="text-[10px] text-[#71717A]">PhonePe, GPay, Paytm</span>
          </div>
        </div>

        {/* Pending EMI Balance */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E2DE] flex items-center gap-4 cursor-pointer hover:border-[#C49A6C]" onClick={() => navigate('/emi')}>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#A39E98] uppercase">Customer Pending EMI</p>
            <p className="font-serif text-lg font-bold text-[#211F1C]">{fmt(stats?.pendingEmiBalance)}</p>
            <span className="text-[10px] text-purple-600 font-semibold">View EMI Accounts &rarr;</span>
          </div>
        </div>
      </div>

      {/* ─── 5. Three Main Categories Stock Valuation ─── */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] p-6 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#211F1C]">Inventory by Category</h3>
            <p className="text-xs text-[#71717A]">Stock volume across Plastic, Wooden, and Steel lines</p>
          </div>
          <button
            onClick={() => navigate('/stock')}
            className="text-xs font-bold text-[#C49A6C] hover:underline flex items-center gap-1"
          >
            Manage Stock <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Steel Items */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E5E2DE]">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#211F1C] text-white">
              Steel Items
            </span>
            <p className="font-serif text-xl font-bold text-[#211F1C] mt-2">
              {stats?.categorySummary?.['Steel Items'] || 0} Units
            </p>
            <p className="text-xs text-[#71717A] mt-1">
              Valuation: <strong>{fmt(stats?.categoryValuation?.['Steel Items'] || 0)}</strong>
            </p>
          </div>

          {/* Wooden Items */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E5E2DE]">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#C49A6C] text-[#211F1C]">
              Wooden Items
            </span>
            <p className="font-serif text-xl font-bold text-[#211F1C] mt-2">
              {stats?.categorySummary?.['Wooden Items'] || 0} Units
            </p>
            <p className="text-xs text-[#71717A] mt-1">
              Valuation: <strong>{fmt(stats?.categoryValuation?.['Wooden Items'] || 0)}</strong>
            </p>
          </div>

          {/* Plastic Items */}
          <div className="p-4 rounded-xl bg-[#F7F5F0] border border-[#E5E2DE]">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-200 text-[#211F1C]">
              Plastic Items
            </span>
            <p className="font-serif text-xl font-bold text-[#211F1C] mt-2">
              {stats?.categorySummary?.['Plastic Items'] || 0} Units
            </p>
            <p className="text-xs text-[#71717A] mt-1">
              Valuation: <strong>{fmt(stats?.categoryValuation?.['Plastic Items'] || 0)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ─── 6. Low Stock Alerts & Recent Transactions Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts (1 Col) */}
        <div className="bg-white rounded-2xl border border-[#E5E2DE] p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E2DE]">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" />
              <h4 className="font-serif font-bold text-base text-[#211F1C]">Low Stock Alerts</h4>
            </div>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
              {stats?.lowStockAlertsCount || 0} Items
            </span>
          </div>

          {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.lowStockProducts.map((p) => (
                <div key={p.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E5E2DE] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#211F1C]">{p.name}</p>
                    <p className="text-[10px] text-[#A39E98]">{p.code} &bull; {p.category}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-rose-600 block">{p.qty} left</span>
                    <span className="text-[9px] text-[#71717A]">Min: {p.min_stock}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-700 font-semibold py-4 text-center">
              All inventory levels healthy. No low stock items!
            </p>
          )}
        </div>

        {/* Recent Transactions (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E2DE] p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5E2DE]">
            <div>
              <h4 className="font-serif font-bold text-base text-[#211F1C]">Recent Transactions</h4>
              <p className="text-xs text-[#71717A]">Live showroom sales stream</p>
            </div>
            <button
              onClick={() => navigate('/sales')}
              className="text-xs font-bold text-[#C49A6C] hover:underline"
            >
              View All &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table-luxury">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentTransactions || []).map((t) => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs font-bold">{t.invoice_number}</td>
                    <td className="font-bold text-xs">{t.customer_name}</td>
                    <td className="text-xs text-[#71717A]">{t.date}</td>
                    <td className="font-bold text-xs">{fmt(t.amount)}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                        t.payment_type === 'FULL_PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (t.payment_type === 'EMI' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800')
                      }`}>
                        {t.payment_type}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedInvoice(t)}
                        className="text-xs font-bold text-[#C49A6C] hover:underline"
                      >
                        Print Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <PrintInvoiceModal
          sale={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;


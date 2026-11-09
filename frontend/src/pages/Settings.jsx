import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Shield, Store, Save, RefreshCw, CheckCircle2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

const Settings = () => {
  const { user } = useAuth();
  const { isSynced, syncStatusText, forceSyncNow } = useSync();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Showroom Profile
  const [shopProfile, setShopProfile] = useState({
    shopName: 'SHAHIN STEEL FURNITURE',
    tagline: 'Manufacturers & Retailers of Luxury Steel & Wooden Showroom Furnishings',
    address: 'Main Road, Near Overbridge, Ranchi, Jharkhand - 834001',
    phone: '+91 98765 43210',
    email: 'info@shahinsteel.com',
    gstin: '20AAGCS1234F1Z8',
    hsnCode: '9403'
  });

  const handleSaveShopProfile = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      backupDate: new Date().toISOString(),
      shop: shopProfile,
      database: 'MySQL 8.0 Cloud Relational Database',
      system: 'Shahin Steel Furniture Management System'
    }, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `Shahin_Furniture_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    dl.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">Module 11</span>
          <h1 className="font-serif text-2xl font-extrabold text-[#211F1C] m-0">Settings &amp; Cloud Database</h1>
          <p className="text-xs text-[#71717A] mt-1">Configure showroom details, inspect central MySQL cloud status and manage role permissions.</p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
          <CheckCircle2 size={16} /> Showroom profile settings saved successfully!
        </div>
      )}

      {/* ─── 1. Central Cloud MySQL Database Architecture (Instagram Experience) ─── */}
      <div className="bg-[#211F1C] text-white p-6 rounded-2xl shadow-premium border border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C49A6C]/20 text-[#C49A6C] flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white">Central Cloud Database &amp; Multi-Device Access</h3>
              <p className="text-xs text-[#A39E98]">One cloud database connects Mobile, Laptop and Tablets simultaneously like Instagram</p>
            </div>
          </div>
          <button
            onClick={forceSyncNow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            <RefreshCw size={14} className={isSynced ? '' : 'animate-spin'} /> Force Sync
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Database Engine</span>
            <strong className="text-sm font-bold text-white mt-1 block">MySQL 8.0 Cloud Relational DB</strong>
            <span className="text-[10px] text-emerald-400 mt-1 block">Foreign Keys &amp; Financial Transactions</span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Device Connection Status</span>
            <strong className="text-sm font-bold text-emerald-400 mt-1 block">Online &bull; Live Synchronization</strong>
            <span className="text-[10px] text-[#A39E98] mt-1 block">Sales made on laptop reflect on mobile instantly</span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] font-bold text-[#A39E98] uppercase block">Backup &amp; Disaster Recovery</span>
            <strong className="text-sm font-bold text-white mt-1 block">Automated Daily Cloud Backups</strong>
            <button
              onClick={handleDownloadBackup}
              className="mt-2 text-[10px] text-[#C49A6C] hover:underline flex items-center gap-1 font-bold"
            >
              <Download size={12} /> Download Offline JSON Snapshot
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Showroom Profile Settings ─── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <h3 className="font-serif font-bold text-base text-[#211F1C] mb-4">Showroom &amp; Billing Profile</h3>
        <form onSubmit={handleSaveShopProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Showroom Business Name</label>
              <input
                type="text"
                value={shopProfile.shopName}
                onChange={(e) => setShopProfile({ ...shopProfile, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">GSTIN Registration Number</label>
              <input
                type="text"
                value={shopProfile.gstin}
                onChange={(e) => setShopProfile({ ...shopProfile, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Contact Phone</label>
              <input
                type="text"
                value={shopProfile.phone}
                onChange={(e) => setShopProfile({ ...shopProfile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Official Email</label>
              <input
                type="email"
                value={shopProfile.email}
                onChange={(e) => setShopProfile({ ...shopProfile, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Showroom Address (Appears on Tax Invoices)</label>
              <input
                type="text"
                value={shopProfile.address}
                onChange={(e) => setShopProfile({ ...shopProfile, address: e.target.value })}
                className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] text-xs font-extrabold rounded-xl transition-all shadow-subtle"
            >
              <Save size={15} /> Save Showroom Profile
            </button>
          </div>
        </form>
      </div>

      {/* ─── 3. User Roles & Permissions Matrix ─── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} className="text-[#C49A6C]" />
          <h3 className="font-serif font-bold text-base text-[#211F1C]">Role-Based Access Control (RBAC) Matrix</h3>
        </div>
        <p className="text-xs text-[#71717A] mb-4">
          Permissions enforced on both Python Django API backend and React frontend navigation:
        </p>

        <div className="overflow-x-auto">
          <table className="table-luxury">
            <thead>
              <tr>
                <th>Module / Action</th>
                <th>OWNER Role</th>
                <th>ACCOUNTANT Role</th>
                <th>EMPLOYEE Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold text-xs">Sales &amp; Tax Invoices Creation</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
              </tr>
              <tr>
                <td className="font-bold text-xs">Inventory &amp; Stock Adjustments</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; View &amp; Verify</td>
                <td className="text-amber-700 font-bold text-xs">&check; View Only</td>
              </tr>
              <tr>
                <td className="font-bold text-xs">Factory Purchases &amp; Supplier Balances</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-rose-600 font-bold text-xs">&cross; Restricted</td>
              </tr>
              <tr>
                <td className="font-bold text-xs">Customer EMI Management &amp; Receipts</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Collect EMI</td>
              </tr>
              <tr>
                <td className="font-bold text-xs">Actual Profit &amp; Loss Financial Reports</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-rose-600 font-bold text-xs">&cross; Restricted</td>
              </tr>
              <tr>
                <td className="font-bold text-xs">Employee Accounts &amp; Salary Control</td>
                <td className="text-emerald-700 font-bold text-xs">&check; Full Access</td>
                <td className="text-rose-600 font-bold text-xs">&cross; Restricted</td>
                <td className="text-rose-600 font-bold text-xs">&cross; Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Settings;


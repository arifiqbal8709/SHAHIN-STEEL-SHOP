import React from 'react';
import { Menu, RefreshCw, Plus, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

const Header = ({ setIsSidebarOpen }) => {
  const { user } = useAuth();
  const { isSynced, syncStatusText, forceSyncNow } = useSync();
  const navigate = useNavigate();

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#E5E2DE] px-4 lg:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden p-2 rounded-xl bg-white border border-[#E5E2DE] text-[#211F1C] hover:bg-[#EEE6DB] transition-colors"
          aria-label="Open Sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">
            SHAHIN STEEL FURNITURE
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-[#211F1C] tracking-tight font-serif m-0 leading-tight">
            Shop Management System
          </h2>
        </div>
      </div>

      {/* Right: Cloud Sync Status, Date & Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Multi-Device Cloud Sync Indicator (Instagram Experience) */}
        <div
          onClick={forceSyncNow}
          title="Click to manually refresh cloud data"
          className="cursor-pointer hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E5E2DE] shadow-subtle hover:border-[#C49A6C] transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSynced ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isSynced ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <span className="text-[11px] font-bold text-[#211F1C]">
            {isSynced ? 'Cloud Synced' : 'Syncing...'}
          </span>
          <span className="text-[10px] text-[#A39E98] border-l border-[#E5E2DE] pl-2 hidden lg:inline">
            MySQL Cloud
          </span>
        </div>

        {/* Date Display */}
        <div className="hidden sm:block text-right pr-2">
          <p className="text-xs font-semibold text-[#211F1C]">{formattedDate}</p>
          <p className="text-[10px] text-[#A39E98] tracking-wider uppercase font-medium">Ranchi Showroom</p>
        </div>

        {/* Create Bill Quick Button */}
        <button
          onClick={() => navigate('/sales/create')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all shadow-subtle"
        >
          <Plus size={15} />
          <span className="hidden xs:inline">New Bill</span>
        </button>

        {/* User Role Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E5E2DE]">
          <div className="w-8 h-8 rounded-full bg-[#EEE6DB] border border-[#C49A6C]/30 flex items-center justify-center text-[#211F1C] font-bold text-xs">
            <User size={15} />
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-[#211F1C] leading-none">
              {user?.role === 'OWNER' && (!user?.name || user?.name === 'Arif Shahin')
                ? 'Shahin Steel'
                : (user?.name || user?.display_name || user?.username || 'User')}
            </p>
            <span className="text-[9px] font-extrabold uppercase text-[#C49A6C] tracking-wide">
              {user?.role === 'OWNER' ? 'Admin / Owner' : 'Sales Staff'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


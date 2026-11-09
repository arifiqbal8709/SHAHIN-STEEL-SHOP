import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  CreditCard,
  UserCheck,
  CalendarCheck,
  Receipt,
  User,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Admin is one: Anyone who is not OWNER gets the Staff Navigation Suite
  const isStaff = user?.role !== 'OWNER';

  // Specific 8 modules for Staff, full management suite for Owner
  const navItems = isStaff
    ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Sales & Billing', path: '/sales/create', icon: FileText },
        { name: 'Inventory', path: '/stock', icon: Package },
        { name: 'Customer Management', path: '/customers', icon: Users },
        { name: 'EMI Management', path: '/emi', icon: CreditCard },
        { name: 'Attendance', path: '/attendance', icon: CalendarCheck },
        { name: 'Invoice History', path: '/invoice-history', icon: Receipt },
        { name: 'My Profile', path: '/my-profile', icon: User },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Sales & Invoices', path: '/sales', icon: FileText },
        { name: 'Inventory / Stock', path: '/stock', icon: Package },
        { name: 'Customer Management', path: '/customers', icon: Users },
        { name: 'EMI Management', path: '/emi', icon: CreditCard },
        { name: 'Staff Management', path: '/employees', icon: ShieldCheck },
        { name: 'Staff Attendance', path: '/attendance', icon: Clock },
        { name: 'Invoice History', path: '/invoice-history', icon: Receipt },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#211F1C] text-[#A39E98] z-50 flex flex-col justify-between border-r border-white/5 transition-transform duration-300 ease-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Top Brand Header */}
          <div className="pt-6 pb-4 px-6 text-center relative border-b border-white/5">
            <div className="inline-flex items-center justify-center mb-1">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 6L6 20V42H42V20L24 6Z" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 42V26C18 24.8954 18.8954 24 20 24H28C29.1046 24 30 24.8954 30 26V42" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24 13L32 19.5" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="font-serif text-xl font-extrabold tracking-[2.5px] text-white m-0">
              SHAHIN
            </h1>
            <p className="text-[9px] font-bold tracking-[2px] text-[#C49A6C] uppercase mt-0.5">
              STEEL FURNITURE
            </p>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                      isActive
                        ? 'bg-[#C49A6C] text-[#211F1C] font-bold shadow-gold-glow'
                        : 'text-[#A39E98] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={17} className="shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            {/* 12. Logout item in navigation list */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all duration-150 text-left mt-2"
            >
              <LogOut size={17} className="shrink-0" />
              <span>Logout</span>
            </button>
          </nav>
        </div>

        {/* Bottom Luxury Showroom Footer */}
        <div className="p-4 border-t border-white/5 bg-[#1A1917]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C49A6C]/20 border border-[#C49A6C]/40 flex items-center justify-center text-[#C49A6C] font-bold text-xs uppercase">
              {user?.username ? user.username.charAt(0) : 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.username || 'Store Staff'}</p>
              <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded tracking-wider bg-[#C49A6C]/20 text-[#C49A6C]">
                {user?.role || 'OWNER'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-[#71717A] mt-3 text-center italic font-serif">
            Quality Furniture, Timeless Comfort.
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;


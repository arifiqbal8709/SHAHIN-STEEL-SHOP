import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Users,
  Smartphone,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, logout, loading } = useAuth();

  // 'STAFF' | 'ADMIN'
  const [activePortal, setActivePortal] = useState('STAFF');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successHint, setSuccessHint] = useState('');

  const usernameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // DO NOT automatically logout on mount so user's active session is never wiped
  useEffect(() => {
    // If user has already entered credentials or is logged in, preserve state
  }, []);

  // Switch to Staff Portal - DO NOT clear manual data entered by user!
  const selectStaffPortal = () => {
    setActivePortal('STAFF');
    // Only clear if previous value was admin auto-fill
    if (username.toLowerCase() === 'admin') {
      setUsername('');
    }
    if (password === 'admin123') {
      setPassword('');
    }
    setErrorMsg('');
    setSuccessHint('Staff Portal selected. Har staff (Keshav, Adil, etc.) apna ID aur Password daal kar login karein.');
    setTimeout(() => {
      if (usernameInputRef.current) usernameInputRef.current.focus();
    }, 100);
  };

  // Switch to Admin Portal
  const selectAdminPortal = () => {
    setActivePortal('ADMIN');
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg('');
    setSuccessHint('Owner / Admin credentials loaded (admin / admin123).');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setErrorMsg(activePortal === 'ADMIN' ? 'Please enter Admin username.' : 'Please enter your Staff ID or Login ID (e.g. keshav, adil).');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setErrorMsg('');
    const res = await login(username.trim(), password.trim());
    if (res.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(res.message || 'Invalid login credentials. Please check your Login ID and Password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#151413] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity filter blur-sm"
        style={{ backgroundImage: `url('/sidebar-furniture.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#151413] via-[#151413]/85 to-transparent" />

      {/* Main Login Card */}
      <div className="relative z-10 max-w-md w-full bg-[#211F1C] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Brand Emblem */}
        <div className="text-center pb-5 border-b border-white/10">
          <div className="inline-flex items-center justify-center mb-2">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 6L6 20V42H42V20L24 6Z" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 42V26C18 24.8954 18.8954 24 20 24H28C29.1046 24 30 24.8954 30 26V42" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 13L32 19.5" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-extrabold tracking-[2px] text-white m-0">SHAHIN</h1>
          <p className="text-[10px] font-bold tracking-[2px] text-[#C49A6C] uppercase mt-0.5">
            STEEL FURNITURE SHOWROOM
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-[#A39E98]">
              <Smartphone size={11} className="text-[#C49A6C]" /> Mobile &bull; Laptop &bull; Counter PC
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TOP PORTAL SELECTOR: ONLY 2 PORTALS (ADMIN & STAFF)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="mt-5 p-1 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-1">
          {/* 1. Staff Login Tab */}
          <button
            type="button"
            onClick={selectStaffPortal}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activePortal === 'STAFF'
                ? 'bg-[#C49A6C] text-[#211F1C] shadow-gold-glow'
                : 'text-[#A39E98] hover:text-white'
            }`}
          >
            <Users size={15} />
            Staff Login
          </button>

          {/* 2. Admin Tab */}
          <button
            type="button"
            onClick={selectAdminPortal}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
              activePortal === 'ADMIN'
                ? 'bg-[#C49A6C] text-[#211F1C] shadow-gold-glow'
                : 'text-[#A39E98] hover:text-white'
            }`}
          >
            <ShieldCheck size={15} />
            Admin (Owner)
          </button>
        </div>

        {/* Active Portal Header Notice */}
        <div className="mt-4 px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {activePortal === 'STAFF' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-bold text-[11px]">Staff Login Portal</span>
                <span className="text-[#A39E98] text-[10px] hidden sm:inline">&bull; All Showroom Staff</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#C49A6C] animate-pulse" />
                <span className="text-[#C49A6C] font-bold text-[11px]">Store Owner Portal</span>
                <span className="text-[#A39E98] text-[10px] hidden sm:inline">&bull; Arif Shahin</span>
              </>
            )}
          </div>
          {activePortal === 'STAFF' && (
            <span className="text-[10px] text-[#C49A6C] font-semibold">Keshav, Adil, etc.</span>
          )}
        </div>

        {/* Success / Status Hint Banner */}
        {successHint && (
          <div className="mt-3 p-2.5 bg-[#C49A6C]/15 border border-[#C49A6C]/30 rounded-xl text-xs text-[#E8D1B5] flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="text-[#C49A6C] shrink-0" />
            <span className="text-[11px] leading-tight">{successHint}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} autoComplete="off" className="space-y-4 mt-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A39E98] mb-1.5">
              {activePortal === 'ADMIN' ? 'Admin Username' : 'Staff Login ID / Staff ID / Name'}
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
              <input
                ref={usernameInputRef}
                type="text"
                autoComplete="off"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#C49A6C] transition-all font-medium"
                placeholder={activePortal === 'ADMIN' ? 'admin' : 'Enter your Staff ID or Login ID (e.g. keshav, adil)'}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A39E98]">
                {activePortal === 'ADMIN' ? 'Admin Password' : 'Password'}
              </label>
              <button
                type="button"
                onClick={() => setPassword(activePortal === 'ADMIN' ? 'admin123' : 'staff123')}
                className="text-[10px] text-[#C49A6C] hover:underline font-bold"
                title="Fill default password"
              >
                {activePortal === 'ADMIN' ? 'Default: admin123' : 'Default: staff123'}
              </button>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-[#C49A6C] transition-all font-medium"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39E98] hover:text-white transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-gold-glow flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : (activePortal === 'ADMIN' ? 'Sign In as Owner' : 'Sign In to Staff Account')}
            <ArrowRight size={15} />
          </button>
        </form>

        {/* ═══════════════════════════════════════════════════════════════════
            QUICK ACCOUNT CARDS: STRICTLY ONLY 2 OPTIONS (OWNER & STAFF)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <p className="text-[10px] font-bold text-[#A39E98] uppercase tracking-wider mb-2.5 text-center">
            Select Showroom Account:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Owner (Admin) Card */}
            <button
              type="button"
              onClick={selectAdminPortal}
              className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-2.5 ${
                activePortal === 'ADMIN'
                  ? 'bg-[#C49A6C]/20 border-[#C49A6C] shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-[#C49A6C]/20 border border-[#C49A6C]/40 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-[#C49A6C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold text-white truncate">Owner (Admin)</div>
                <div className="text-[9px] text-[#A39E98] truncate">Arif Shahin &bull; admin</div>
              </div>
            </button>

            {/* 2. Single Staff Login Card (For all staff members: Keshav, Adil, etc.) */}
            <button
              type="button"
              onClick={selectStaffPortal}
              className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-2.5 ${
                activePortal === 'STAFF'
                  ? 'bg-[#C49A6C]/20 border-[#C49A6C] shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 border-white/10'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-[#C49A6C]">
                <Users size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold text-white truncate">Staff Login</div>
                <div className="text-[9px] text-[#A39E98] truncate">Keshav, Adil &amp; All Staff</div>
              </div>
            </button>
          </div>

          <p className="text-[10px] text-[#A39E98] text-center mt-3 leading-relaxed">
            Staff Login me har employee (Keshav, Adil, etc.) apna apna ID aur password daalega, to system unhe unke hi personal dashboard me le jayega.
          </p>
        </div>

        <p className="text-[10px] text-[#71717A] text-center mt-5">
          &copy; {new Date().getFullYear()} SHAHIN STEEL FURNITURE &bull; All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default Login;

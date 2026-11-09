import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Trash2,
  Zap,
  X,
  ShieldCheck,
  Check,
  Coffee
} from 'lucide-react';
import { attendanceAPI, employeesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AttendancePage = () => {
  const { user, isOwner } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });

  // Half Day Leave Modal State
  const [isHalfDayModalOpen, setIsHalfDayModalOpen] = useState(false);
  const [halfDayReason, setHalfDayReason] = useState('Personal Emergency');
  const [submittingHalfDay, setSubmittingHalfDay] = useState(false);

  // Admin Quick Mark State
  const [adminActionEmp, setAdminActionEmp] = useState(null);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedEmp) {
        params.employee_id = selectedEmp;
      } else if (!isOwner() && user?.employee_id) {
        params.employee_id = user.employee_id;
      }

      const res = await attendanceAPI.getHistory(params);
      if (res && res.data) {
        setRecords(res.data);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeesAPI.getAll();
      if (res && res.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error('Failed to load employee list:', err);
    }
  };

  useEffect(() => {
    loadAttendance();
    loadEmployees();
    window.addEventListener('shahin-cloud-sync', loadAttendance);
    return () => window.removeEventListener('shahin-cloud-sync', loadAttendance);
  }, [selectedEmp]);

  // Check today's status for active user
  const todayStr = new Date().toISOString().slice(0, 10);
  const myEmployeeId = user?.employee_id;
  const todayRecord = records.find(r => 
    r.date === todayStr && 
    (myEmployeeId ? (String(r.employee_id) === String(myEmployeeId) || String(r.employee) === String(myEmployeeId)) : true)
  );

  const handleCheckIn = async () => {
    setSubmitting(true);
    setFeedback({ type: '', msg: '' });
    try {
      const empId = user?.employee_id || (employees[0]?.id);
      const res = await attendanceAPI.checkIn({ employee_id: empId });
      if (res && res.success) {
        setFeedback({ type: 'success', msg: res.message || 'Check-in recorded successfully!' });
        await loadAttendance();
      } else {
        setFeedback({ type: 'error', msg: res?.message || 'Check-in failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || err.message || 'Check-in error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Do you want to clock out for your full shift?')) return;
    setSubmitting(true);
    setFeedback({ type: '', msg: '' });
    try {
      const empId = user?.employee_id || (employees[0]?.id);
      const res = await attendanceAPI.checkOut({ employee_id: empId });
      if (res && res.success) {
        setFeedback({ type: 'success', msg: res.message || 'Check-out recorded successfully!' });
        await loadAttendance();
      } else {
        setFeedback({ type: 'error', msg: res?.message || 'Check-out failed.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || err.message || 'Check-out error.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Staff Submits Half-Day Leave
  const handleHalfDaySubmit = async () => {
    setSubmittingHalfDay(true);
    setFeedback({ type: '', msg: '' });
    try {
      const empId = user?.employee_id || (employees[0]?.id);
      const res = await attendanceAPI.markHalfDay({
        employee_id: empId,
        notes: halfDayReason || 'Half Day Leave'
      });
      if (res && res.success) {
        setFeedback({ type: 'success', msg: res.message || 'Half Day Leave logged successfully! Admin has been notified.' });
        setIsHalfDayModalOpen(false);
        setHalfDayReason('Personal Emergency');
        await loadAttendance();
      } else {
        setFeedback({ type: 'error', msg: res?.message || 'Failed to record half day leave.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || err.message || 'Error recording half day leave.' });
    } finally {
      setSubmittingHalfDay(false);
    }
  };

  // Staff Requests Full Day Leave
  const handleMarkLeave = async () => {
    const reason = window.prompt('Enter reason for taking full-day leave today:');
    if (!reason || !reason.trim()) return;

    setSubmitting(true);
    try {
      const empId = user?.employee_id || (employees[0]?.id);
      const res = await attendanceAPI.markLeave({
        employee_id: empId,
        notes: reason.trim()
      });
      if (res && res.success) {
        setFeedback({ type: 'success', msg: res.message || 'Full-Day Leave recorded!' });
        await loadAttendance();
      } else {
        setFeedback({ type: 'error', msg: res?.message || 'Failed to record leave.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.response?.data?.message || err.message || 'Error recording leave.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Quick Mark Attendance directly for any employee
  const handleAdminQuickMark = async (empId, statusVal, defaultNote = '') => {
    const note = window.prompt(`Mark ${statusVal} for employee. Add optional note / reason:`, defaultNote);
    if (note === null) return;

    try {
      const res = await attendanceAPI.adminMark({
        employee_id: empId,
        date: todayStr,
        status: statusVal,
        notes: note.trim()
      });
      if (res && res.success) {
        setFeedback({ type: 'success', msg: res.message || `Attendance updated to ${statusVal}.` });
        await loadAttendance();
      } else {
        alert(res?.message || 'Failed to update attendance.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Error updating attendance.');
    }
  };

  const fmtTime = (t) => {
    if (!t) return '--:--';
    if (t.includes('AM') || t.includes('PM')) return t;
    const parts = t.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const handleDeleteAttendance = async (rec) => {
    if (!window.confirm(`Are you sure you want to delete attendance record for "${rec.employee_name || 'Staff'}" on ${rec.date}?`)) return;
    try {
      const res = await attendanceAPI.delete(rec.id);
      if (res && res.success) {
        loadAttendance();
      } else {
        alert(res?.message || 'Failed to delete attendance record');
      }
    } catch (err) {
      alert('Error deleting attendance: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllAttendance = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL staff attendance records? This cannot be undone!')) return;
    try {
      const res = await attendanceAPI.deleteAll();
      if (res && res.success) {
        alert('All attendance records have been cleared successfully!');
        loadAttendance();
      } else {
        alert(res?.message || 'Failed to clear attendance');
      }
    } catch (err) {
      alert('Error clearing attendance: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. Header Banner ─── */}
      <div className="bg-[#211F1C] text-white p-6 rounded-2xl border border-white/5 shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C49A6C]">
            SHAHIN STEEL FURNITURE • ATTENDANCE LOG
          </span>
          <h1 className="font-serif text-2xl font-bold mt-1 text-white">
            Staff Attendance &amp; Shift Tracker
          </h1>
          <p className="text-xs text-[#A39E98] mt-0.5">
            {isOwner()
              ? 'Owner live oversight: view staff arrivals, check-outs, half-day leaves, and work duration.'
              : 'Log your shift attendance, check-in, or request half-day leave with live manager updates.'}
          </p>
        </div>

        {/* Quick Check-in Actions for logged in user */}
        {!isOwner() ? (
          <div className="bg-[#1A1917] p-3.5 rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-left min-w-[130px]">
              <span className="text-[10px] font-bold uppercase text-[#C49A6C]">Today's Status</span>
              <p className="text-xs font-bold text-white">
                {todayRecord?.status === 'HALF_DAY'
                  ? '⚡ Half Day Leave'
                  : todayRecord?.status === 'LEAVE'
                  ? '✕ On Leave'
                  : todayRecord?.check_in_time
                  ? (todayRecord?.check_out_time ? 'Shift Completed' : 'Clocked In')
                  : 'Not Checked In'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {todayRecord?.status === 'HALF_DAY' ? (
                <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Zap size={13} /> Half Day (4.0 hrs)
                </span>
              ) : todayRecord?.status === 'LEAVE' ? (
                <span className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Clock size={13} /> On Leave
                </span>
              ) : !todayRecord?.check_in_time ? (
                <>
                  <button
                    onClick={handleCheckIn}
                    disabled={submitting}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    title="Check in for normal shift"
                  >
                    <Clock size={14} /> Check In
                  </button>
                  <button
                    onClick={() => setIsHalfDayModalOpen(true)}
                    disabled={submitting}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    title="Take half day leave"
                  >
                    <Zap size={14} /> Half Day Leave
                  </button>
                  <button
                    onClick={handleMarkLeave}
                    disabled={submitting}
                    className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold border border-white/10 transition-all"
                    title="Mark full day leave"
                  >
                    Leave
                  </button>
                </>
              ) : !todayRecord?.check_out_time ? (
                <>
                  <button
                    onClick={handleCheckOut}
                    disabled={submitting}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    title="End full working shift"
                  >
                    <Clock size={14} /> Check Out
                  </button>
                  <button
                    onClick={() => setIsHalfDayModalOpen(true)}
                    disabled={submitting}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                    title="Depart early for half day leave"
                  >
                    <Zap size={14} /> Half Day Leave
                  </button>
                </>
              ) : (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> {todayRecord.working_hours} hrs
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1917] px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs">
            <ShieldCheck size={16} className="text-[#C49A6C]" />
            <span className="text-white font-bold">Owner Administrator Mode</span>
          </div>
        )}
      </div>

      {feedback.msg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* ─── 2. TODAY'S LIVE STAFF ATTENDANCE ROSTER (Visible in Admin Section) ─── */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-serif text-base font-bold text-[#211F1C]">Today's Live Showroom Staff Roster</h3>
            </div>
            <p className="text-xs text-[#71717A]">
              Live status for today ({new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })})
            </p>
          </div>
          <span className="text-xs font-bold text-stone-500 bg-[#F7F5F0] px-3 py-1 rounded-xl border border-[#E5E2DE]">
            Staff Count: {employees.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const empTodayAtt = records.find(r => 
              r.date === todayStr && 
              (String(r.employee_id) === String(emp.id) || String(r.employee) === String(emp.id))
            );

            const isPresent = empTodayAtt?.status === 'PRESENT';
            const isHalfDay = empTodayAtt?.status === 'HALF_DAY';
            const isLeave = empTodayAtt?.status === 'LEAVE' || empTodayAtt?.status === 'ABSENT';
            const notMarked = !empTodayAtt;

            return (
              <div
                key={emp.id}
                className={`p-4 rounded-xl border transition-all ${
                  isHalfDay
                    ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                    : isPresent
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-sm'
                    : isLeave
                    ? 'bg-rose-50/40 border-rose-200'
                    : 'bg-[#FAF8F5] border-[#E5E2DE]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#211F1C] flex items-center gap-1.5">
                      <span>{emp.name}</span>
                      <span className="text-[10px] font-mono text-[#71717A]">({emp.employee_code})</span>
                    </h4>
                    <p className="text-[11px] text-[#71717A]">{emp.designation || 'Sales Staff'}</p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isHalfDay ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400 flex items-center gap-1 shadow-xs">
                        <Zap size={12} className="text-amber-800" /> HALF DAY LEAVE
                      </span>
                    ) : isPresent ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-200 text-emerald-950 border border-emerald-400 flex items-center gap-1 shadow-xs">
                        <Check size={12} /> PRESENT
                      </span>
                    ) : isLeave ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-200 text-rose-950 border border-rose-300 flex items-center gap-1">
                        <X size={12} /> ON LEAVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-stone-200 text-stone-700">
                        NOT CHECKED IN
                      </span>
                    )}
                  </div>
                </div>

                {/* Shift Details */}
                <div className="text-xs space-y-1 pt-2 border-t border-[#E5E2DE]/60">
                  <div className="flex justify-between text-[#71717A] text-[11px]">
                    <span>Clock In: <strong className="text-[#211F1C] font-mono">{fmtTime(empTodayAtt?.check_in_time)}</strong></span>
                    <span>Clock Out: <strong className="text-[#211F1C] font-mono">{fmtTime(empTodayAtt?.check_out_time)}</strong></span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#71717A]">Hours Credited:</span>
                    <span className="font-bold text-[#211F1C]">
                      {empTodayAtt?.working_hours ? `${Number(empTodayAtt.working_hours).toFixed(2)} hrs` : (notMarked ? '0.00 hrs' : '--')}
                    </span>
                  </div>

                  {empTodayAtt?.notes && (
                    <div className="text-[10.5px] p-1.5 rounded-lg bg-white/80 border border-black/5 text-stone-700 italic">
                      <span className="font-bold not-italic text-stone-900">Note: </span>
                      {empTodayAtt.notes}
                    </div>
                  )}
                </div>

                {/* Admin Quick Actions for this staff */}
                {isOwner() && (
                  <div className="mt-3 pt-2.5 border-t border-[#E5E2DE] flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Admin:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAdminQuickMark(emp.id, 'PRESENT', 'Full day present')}
                        className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold transition-all"
                        title="Mark as Present"
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleAdminQuickMark(emp.id, 'HALF_DAY', 'Half Day Leave')}
                        className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold transition-all"
                        title="Mark as Half Day"
                      >
                        Half Day
                      </button>
                      <button
                        onClick={() => handleAdminQuickMark(emp.id, 'LEAVE', 'Full day authorized leave')}
                        className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 text-[10px] font-bold transition-all"
                        title="Mark as Leave"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 3. Monthly Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Days Present</span>
          <p className="text-2xl font-serif font-black text-emerald-700 mt-1">
            {summary?.days_present || records.filter(r => r.status === 'PRESENT').length}
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Full working shifts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-300 bg-amber-50/20 shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
            <Zap size={12} /> Half-Day Leaves
          </span>
          <p className="text-2xl font-serif font-black text-amber-700 mt-1">
            {summary?.days_half_day || records.filter(r => r.status === 'HALF_DAY').length}
          </p>
          <p className="text-[11px] text-amber-900 mt-1">Partial shifts (4 hrs)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Leaves Taken</span>
          <p className="text-2xl font-serif font-black text-rose-700 mt-1">
            {summary?.days_leave || records.filter(r => r.status === 'LEAVE' || r.status === 'ABSENT').length}
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Authorized leaves</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Total Hours Worked</span>
          <p className="text-2xl font-serif font-black text-[#C49A6C] mt-1">
            {summary?.total_hours ? summary.total_hours.toFixed(1) : '0.0'} <span className="text-sm font-sans font-medium text-[#71717A]">hrs</span>
          </p>
          <p className="text-[11px] text-[#71717A] mt-1">Cumulative month hours</p>
        </div>
      </div>

      {/* ─── 4. Owner Filter (if Owner) ─── */}
      {isOwner() && (
        <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#C49A6C]" />
            <span className="text-xs font-bold text-[#211F1C]">Filter Staff Member:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E5E2DE] text-xs font-semibold text-[#211F1C] bg-[#FAF8F5] focus:outline-none focus:border-[#C49A6C]"
            >
              <option value="">All Staff Members</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ─── 5. Attendance History Table ─── */}
      <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-[#E5E2DE] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-[#211F1C]">Shift History &amp; Attendance Log Entries</h3>
            <p className="text-xs text-[#71717A]">Time stamps, duration, working hours, and leave reasons</p>
          </div>
          <div className="flex items-center gap-2.5">
            {isOwner() && records.length > 0 && (
              <button
                onClick={handleClearAllAttendance}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all"
                title="Delete all attendance logs"
              >
                <Trash2 size={13} /> Clear All
              </button>
            )}
            <span className="text-xs font-bold text-[#71717A]">{records.length} records found</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E5E2DE] text-[#71717A] uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Clock In</th>
                <th className="py-3 px-4 text-center">Clock Out</th>
                <th className="py-3 px-4 text-right">Working Hours</th>
                <th className="py-3 px-4">Notes / Leave Reason</th>
                {isOwner() && <th className="py-3 px-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DE]">
              {records.length > 0 ? (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#211F1C]">
                      {new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#211F1C]">{rec.employee_name || 'Staff'}</p>
                      <span className="text-[10px] font-mono text-[#71717A]">{rec.employee_code || ''}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : rec.status === 'HALF_DAY'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {rec.status === 'HALF_DAY' && <Zap size={11} />}
                        {rec.status === 'HALF_DAY' ? 'HALF DAY LEAVE' : rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-emerald-700">
                      {fmtTime(rec.check_in_time)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-[#71717A]">
                      {fmtTime(rec.check_out_time)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-serif font-bold text-[#C49A6C]">
                      {rec.working_hours ? `${Number(rec.working_hours).toFixed(2)} hrs` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-[#71717A] text-[11px]">
                      {rec.notes ? (
                        <span className="font-medium text-stone-800">{rec.notes}</span>
                      ) : (
                        <span className="italic text-stone-400">Normal Shift</span>
                      )}
                    </td>
                    {isOwner() && (
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteAttendance(rec)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                          title="Delete attendance record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isOwner() ? 8 : 7} className="py-8 text-center text-[#71717A]">
                    No attendance records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 6. Half Day Leave Request Modal ─── */}
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
                  Your shift will be recorded as <strong className="text-black font-extrabold">HALF DAY (4.00 hrs credited)</strong> and will immediately show on the Owner/Admin section.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1.5">
                  Select Reason for Leaving *
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
                  placeholder="Enter reason for leaving early..."
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
                onClick={handleHalfDaySubmit}
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
    </div>
  );
};

export default AttendancePage;



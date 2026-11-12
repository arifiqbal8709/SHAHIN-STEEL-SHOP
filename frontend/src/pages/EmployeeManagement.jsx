import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Receipt,
  IndianRupee,
  Lock,
  Unlock,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  KeyRound,
  Edit3,
  UserX,
  Power,
  Filter,
  Eye,
  Banknote,
  QrCode,
  FileText,
  Trash2,
  ChevronRight,
  CreditCard,
  MapPin,
  CalendarDays
} from 'lucide-react';
import { employeesAPI, salariesAPI, attendanceAPI, salesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const isPrimaryOwnerEmployee = (emp) => {
  const uname = (emp?.username || '').toLowerCase();
  return uname === 'shahin_industry' || uname === 'admin';
};

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  // Active Tab
  // 'EMPLOYEES' | 'SALES_REPORT' | 'SALARY' | 'ATTENDANCE' | 'CASH_REGISTER'
  const [activeTab, setActiveTab] = useState('EMPLOYEES');

  // Main State
  const [employees, setEmployees] = useState([]);
  const [registers, setRegisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // ─── 1. EMPLOYEES & STAFF ACCOUNTS STATE ───
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [addEmployeeForm, setAddEmployeeForm] = useState({
    name: '',
    phone: '',
    address: '',
    joining_date: new Date().toISOString().slice(0, 10),
    monthly_salary: 15000,
    username: '',
    password: '',
    designation: 'Sales Executive',
    email: '',
    is_active: true,
    can_manage_sales: true,
    can_edit_sales: false,
    can_give_discount: true,
    can_print_invoices: true,
    can_manage_customers: true,
    can_view_inventory: true,
    can_adjust_stock: false,
    can_view_emi: true,
    can_collect_emi: true,
    can_manage_attendance: true
  });

  const [editEmployeeForm, setEditEmployeeForm] = useState({
    name: '',
    phone: '',
    username: '',
    address: '',
    monthly_salary: 15000,
    designation: '',
    joining_date: '',
    email: ''
  });

  const [permissionsForm, setPermissionsForm] = useState({});
  const [resetPasswordForm, setResetPasswordForm] = useState({ new_password: '' });

  // ─── 2. SALES MONITORING & REPORT STATE ───
  const [reportFilterType, setReportFilterType] = useState('today'); // 'today' | 'yesterday' | 'this_month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedReportEmployeeId, setSelectedReportEmployeeId] = useState('');
  const [salesReportData, setSalesReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [inspectedSale, setInspectedSale] = useState(null);

  // ─── 3. SALARY & ADVANCE STATE ───
  const [salaryMonth, setSalaryMonth] = useState(new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }));
  const [salaryData, setSalaryData] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [isRecordSalaryModalOpen, setIsRecordSalaryModalOpen] = useState(false);
  const [salaryPaymentForm, setSalaryPaymentForm] = useState({
    employee_id: '',
    month: new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    record_type: 'SALARY', // 'SALARY' | 'ADVANCE'
    monthly_salary: 15000,
    advance_amount: 0,
    amount_paid: 15000,
    payment_mode: 'CASH',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  // ─── 4. ATTENDANCE MANAGEMENT STATE ───
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ days_present: 0, days_half_day: 0, days_leave: 0, total_hours: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [adminMarkDate, setAdminMarkDate] = useState(new Date().toISOString().slice(0, 10));
  const [adminMarkEmployeeId, setAdminMarkEmployeeId] = useState('');
  const [adminMarkStatus, setAdminMarkStatus] = useState('PRESENT');
  const [adminMarkHours, setAdminMarkHours] = useState('8.00');
  const [adminMarkNotes, setAdminMarkNotes] = useState('');

  // ─── 5. CASH REGISTER STATE ───
  const [isOpenRegisterModal, setIsOpenRegisterModal] = useState(false);
  const [isCloseRegisterModal, setIsCloseRegisterModal] = useState(false);
  const [selectedRegisterToClose, setSelectedRegisterToClose] = useState(null);
  const [openRegForm, setOpenRegForm] = useState({
    employee_id: '',
    opening_balance: 2000,
    notes: 'Morning shift opening cash in counter drawer'
  });
  const [closeRegForm, setCloseRegForm] = useState({
    closing_cash: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Helper toast notification
  const showToast = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4500);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  // ─── LOAD INITIAL DATA ───
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await employeesAPI.getAll();
      if (res && res.data) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisters = async () => {
    try {
      const res = await employeesAPI.getRegisters();
      if (res && res.data) {
        setRegisters(res.data);
      }
    } catch (err) {
      console.error('Error fetching registers:', err);
    }
  };

  const loadSalesReport = async () => {
    setReportLoading(true);
    try {
      const params = { filter_type: reportFilterType };
      if (reportFilterType === 'custom') {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }
      if (selectedReportEmployeeId) {
        params.employee_id = selectedReportEmployeeId;
      }
      const res = await employeesAPI.getSalesReport(params);
      if (res && res.success) {
        setSalesReportData(res);
      }
    } catch (err) {
      console.error('Error loading sales report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const loadSalaryData = async () => {
    setSalaryLoading(true);
    try {
      const res = await salariesAPI.getAll({ month: salaryMonth });
      if (res && res.success) {
        setSalaryData(res);
      }
    } catch (err) {
      console.error('Error loading salary data:', err);
    } finally {
      setSalaryLoading(false);
    }
  };

  const loadAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const res = await attendanceAPI.getHistory();
      if (res && res.data) {
        setAttendanceRecords(res.data);
        if (res.summary) setAttendanceSummary(res.summary);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleDeleteAttendance = async (att) => {
    if (!window.confirm(`Are you sure you want to delete attendance record for "${att.employee_name}" on ${att.date}?`)) return;
    try {
      const res = await attendanceAPI.delete(att.id);
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

  useEffect(() => {
    loadEmployees();
    loadRegisters();
  }, []);

  useEffect(() => {
    if (activeTab === 'SALES_REPORT') {
      loadSalesReport();
    } else if (activeTab === 'SALARY') {
      loadSalaryData();
    } else if (activeTab === 'ATTENDANCE') {
      loadAttendance();
    }
  }, [activeTab, reportFilterType, selectedReportEmployeeId, salaryMonth]);

  // Sync listener across tabs & devices
  useEffect(() => {
    const handleSync = () => {
      loadEmployees();
      if (activeTab === 'SALES_REPORT') loadSalesReport();
      if (activeTab === 'SALARY') loadSalaryData();
      if (activeTab === 'ATTENDANCE') loadAttendance();
      loadRegisters();
    };
    window.addEventListener('shahin-cloud-sync', handleSync);
    return () => window.removeEventListener('shahin-cloud-sync', handleSync);
  }, [activeTab]);

  // Active counter drawer for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeTodayRegister = registers.find(
    (r) => (r.date === todayStr || r.register_date === todayStr) && r.status === 'OPEN'
  );

  // ─── 1. CREATE EMPLOYEE HANDLER ───
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!addEmployeeForm.name.trim() || !addEmployeeForm.phone.trim()) {
      alert('Employee Name and Mobile Number are required.');
      return;
    }
    if (!addEmployeeForm.username.trim() || !addEmployeeForm.password.trim()) {
      alert('Login ID and Password are required so the employee can log in.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: addEmployeeForm.name.trim(),
        phone: addEmployeeForm.phone.trim(),
        address: addEmployeeForm.address.trim(),
        joining_date: addEmployeeForm.joining_date,
        monthly_salary: Number(addEmployeeForm.monthly_salary || 0),
        base_salary: Number(addEmployeeForm.monthly_salary || 0),
        username: addEmployeeForm.username.trim().toLowerCase(),
        password: addEmployeeForm.password.trim(),
        temporary_password: addEmployeeForm.password.trim(),
        designation: addEmployeeForm.designation.trim() || 'Sales Executive',
        email: addEmployeeForm.email.trim(),
        is_active: addEmployeeForm.is_active,
        can_manage_sales: addEmployeeForm.can_manage_sales,
        can_edit_sales: addEmployeeForm.can_edit_sales,
        can_give_discount: addEmployeeForm.can_give_discount,
        can_print_invoices: addEmployeeForm.can_print_invoices,
        can_manage_customers: addEmployeeForm.can_manage_customers,
        can_view_inventory: addEmployeeForm.can_view_inventory,
        can_adjust_stock: addEmployeeForm.can_adjust_stock,
        can_view_emi: addEmployeeForm.can_view_emi,
        can_collect_emi: addEmployeeForm.can_collect_emi,
        can_manage_attendance: addEmployeeForm.can_manage_attendance
      };

      const res = await employeesAPI.create(payload);
      if (res && res.success) {
        setIsAddEmployeeModalOpen(false);
        setAddEmployeeForm({
          name: '',
          phone: '',
          address: '',
          joining_date: new Date().toISOString().slice(0, 10),
          monthly_salary: 15000,
          username: '',
          password: '',
          designation: 'Sales Executive',
          email: '',
          is_active: true,
          can_manage_sales: true,
          can_edit_sales: false,
          can_give_discount: true,
          can_print_invoices: true,
          can_manage_customers: true,
          can_view_inventory: true,
          can_adjust_stock: false,
          can_view_emi: true,
          can_collect_emi: true,
          can_manage_attendance: true
        });
        await loadEmployees();
        showToast(`Employee "${payload.name}" added successfully with Login ID "${payload.username}".`);
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      } else {
        alert(res?.message || 'Failed to add employee.');
      }
    } catch (err) {
      alert('Error creating employee: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 2. EDIT EMPLOYEE HANDLER ───
  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      const payload = { ...editEmployeeForm };
      if (!payload.password || !payload.password.trim()) {
        delete payload.password;
      }
      const res = await employeesAPI.update(selectedEmployee.id, payload);
      if (res && res.success) {
        setIsEditEmployeeModalOpen(false);
        await loadEmployees();
        showToast(`Employee profile for ${selectedEmployee.name} updated.`);
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      } else {
        alert(res?.message || 'Failed to update employee.');
      }
    } catch (err) {
      alert('Error updating employee: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 3. PERMISSIONS UPDATE HANDLER ───
  const handlePermissionsSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      const res = await employeesAPI.updatePermissions(selectedEmployee.id, permissionsForm);
      if (res && res.success) {
        setIsPermissionsModalOpen(false);
        await loadEmployees();
        showToast(`Permissions updated for ${selectedEmployee.name}.`);
      } else {
        alert(res?.message || 'Failed to update permissions.');
      }
    } catch (err) {
      alert('Error updating permissions: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 4. RESET PASSWORD HANDLER ───
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !resetPasswordForm.new_password.trim()) {
      alert('Please enter a new password.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await employeesAPI.resetPassword(selectedEmployee.id, resetPasswordForm.new_password.trim());
      if (res && res.success) {
        setIsResetPasswordModalOpen(false);
        setResetPasswordForm({ new_password: '' });
        showToast(`Password successfully updated for ${selectedEmployee.name}!`);
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      } else {
        alert(res?.message || 'Failed to reset password.');
      }
    } catch (err) {
      alert('Error resetting password: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 5. TOGGLE ACTIVE/INACTIVE HANDLER ───
  const handleToggleStatus = async (emp) => {
    const action = emp.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${emp.name}'s account?`)) return;
    try {
      const res = await employeesAPI.toggleStatus(emp.id);
      if (res && res.success) {
        await loadEmployees();
        showToast(`Account status updated for ${emp.name}.`);
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      }
    } catch (err) {
      alert('Error toggling status: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─── 6. MARK STAFF AS LEFT SHOP (100% DATA PRESERVATION IN ADMIN) ───
  const handleMarkLeftShop = async (emp) => {
    const isCurrentlyActive = emp.is_active !== false;
    if (isCurrentlyActive) {
      const confirmMsg = `Kya ${emp.name} ne showroom chhod diya hai?\n\nDHAYAN RAKHEIN:\n1. Unka device login turant band ho jayega.\n2. Unke dwara banaye gaye sabhi PURANE BILL, SALES, CASH/UPI COLLECTION, aur ATTENDANCE Admin me 100% SURAKSHIT (SAFE) rahenge.\n3. Koi bhi purana data delete nahi hoga.`;
      if (!window.confirm(confirmMsg)) return;

      try {
        const res = await employeesAPI.delete(emp.id);
        if (res && res.success) {
          await loadEmployees();
          showToast(`Staff ${emp.name} ko 'Shop Left' mark kar diya gaya hai. Login band hai lekin sabhi purane records surakshit hain.`);
        }
      } catch (err) {
        alert('Error: ' + (err.response?.data?.message || err.message));
      }
    } else {
      const confirmRejoin = `Kya ${emp.name} wapas showroom rejoin kar rahe hain?\n\nUnka staff login wapas chalu kar diya jayega.`;
      if (!window.confirm(confirmRejoin)) return;

      try {
        const res = await employeesAPI.toggleStatus(emp.id);
        if (res && res.success) {
          await loadEmployees();
          showToast(`Staff ${emp.name} ka account wapas ACTIVE kar diya gaya hai!`);
        }
      } catch (err) {
        alert('Error reactivating: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // ─── 6B. PERMANENT DELETE EMPLOYEE (KEEPS PAST INVOICES/SALES INTACT) ───
  const handleDeleteEmployeePermanently = async (emp) => {
    if (isPrimaryOwnerEmployee(emp)) return;
    const confirmMsg = `Are you sure you want to PERMANENTLY delete "${emp.name}" (${emp.employee_code})?\n\nThis will permanently remove their employee profile, login ID (${emp.username || 'none'}), attendance, and salary records.\nPast sales invoices and payment records will stay safe.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await employeesAPI.delete(emp.id, true);
      if (res && res.success) {
        await loadEmployees();
        showToast(res.message || `Employee "${emp.name}" permanently deleted.`);
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      } else {
        alert(res?.message || 'Failed to delete employee permanently.');
      }
    } catch (err) {
      alert('Error deleting employee: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─── 7. SALARY PAYMENT SUBMIT ───
  const handleRecordSalarySubmit = async (e) => {
    e.preventDefault();
    if (!salaryPaymentForm.employee_id) {
      alert('Please select an employee.');
      return;
    }
    if (Number(salaryPaymentForm.amount_paid) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await salariesAPI.create(salaryPaymentForm);
      if (res && res.success) {
        setIsRecordSalaryModalOpen(false);
        await loadSalaryData();
        showToast(res.message || 'Payment recorded successfully.');
      } else {
        alert(res?.message || 'Failed to record salary payment.');
      }
    } catch (err) {
      alert('Error recording salary: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 8. ADMIN MARK ATTENDANCE SUBMIT ───
  const handleAdminMarkAttendance = async (e) => {
    e.preventDefault();
    if (!adminMarkEmployeeId) {
      alert('Please select an employee.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_id: adminMarkEmployeeId,
        date: adminMarkDate,
        status: adminMarkStatus,
        working_hours: Number(adminMarkHours || 0),
        notes: adminMarkNotes
      };
      const res = await attendanceAPI.adminMark(payload);
      if (res && res.success) {
        await loadAttendance();
        showToast(res.message || 'Attendance saved.');
        setAdminMarkNotes('');
      } else {
        alert(res?.message || 'Failed to save attendance.');
      }
    } catch (err) {
      alert('Error saving attendance: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 8. CANCEL BILL & RESTORE STOCK ───
  const handleCancelBill = async (sale) => {
    const reason = window.prompt(
      `Are you sure you want to cancel Bill ${sale.invoice_number}?\n\nThis will automatically restore all ${sale.total_products_count} sold items back to live inventory stock.\n\nEnter reason for cancellation:`,
      'Customer returned item / order cancelled'
    );
    if (!reason) return;

    setSubmitting(true);
    try {
      const res = await salesAPI.cancel(sale.invoice_number, reason);
      if (res && res.success) {
        showToast(`Bill ${sale.invoice_number} cancelled. Items restored to live stock!`);
        setInspectedSale(null);
        await loadSalesReport();
        window.dispatchEvent(new CustomEvent('shahin-cloud-sync'));
      } else {
        alert(res?.message || 'Failed to cancel bill.');
      }
    } catch (err) {
      alert('Error cancelling bill: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 9. CASH REGISTER SUBMITS ───
  const handleOpenRegisterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await employeesAPI.openRegister(openRegForm);
      if (res && res.success) {
        setIsOpenRegisterModal(false);
        await loadRegisters();
        showToast('Counter drawer opened! Starting cash balance recorded.');
      }
    } catch (err) {
      alert('Error opening drawer: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRegisterToClose) return;
    setSubmitting(true);
    try {
      const res = await employeesAPI.closeRegister(selectedRegisterToClose.id, closeRegForm);
      if (res && res.success) {
        setIsCloseRegisterModal(false);
        await loadRegisters();
        showToast(res.message || 'Counter closed and cash tallied.');
      }
    } catch (err) {
      alert('Error closing drawer: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered employees for list
  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.name || '').toLowerCase().includes(q) ||
      (e.employee_code || '').toLowerCase().includes(q) ||
      (e.phone || '').toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* ─── Top Showroom Executive Banner ─── */}
      <div className="bg-[#211F1C] text-white p-6 rounded-2xl border border-white/5 shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#C49A6C]">
            SHAHIN STEEL FURNITURE • STORE MANAGEMENT
          </span>
          <h1 className="font-serif text-2xl font-bold mt-1 text-white">
            Employee &amp; Staff Management
          </h1>
          <p className="text-xs text-[#A39E98] mt-0.5">
            Manage staff login accounts, track live sales &amp; cash/online collections, record attendance &amp; manage salaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C49A6C] text-[#211F1C] hover:bg-[#B38758] text-xs font-bold transition-all shadow-gold-glow shrink-0"
          >
            <Plus size={16} /> Add New Employee
          </button>

          {!activeTodayRegister ? (
            <button
              onClick={() => {
                setOpenRegForm({
                  employee_id: employees[0]?.id || '',
                  opening_balance: 2000,
                  notes: 'Morning shift opening cash in counter drawer'
                });
                setIsOpenRegisterModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs font-bold transition-all shrink-0"
            >
              <Unlock size={15} /> Open Cash Drawer
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedRegisterToClose(activeTodayRegister);
                setCloseRegForm({
                  closing_cash: activeTodayRegister.expected_cash || activeTodayRegister.opening_balance,
                  notes: ''
                });
                setIsCloseRegisterModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold transition-all shadow-subtle shrink-0"
            >
              <Lock size={15} /> Close Drawer (Tally)
            </button>
          )}
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-fadeIn">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* ─── Navigation Tabs ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E2DE] pb-2">
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'EMPLOYEES'
              ? 'bg-[#211F1C] text-white shadow-subtle'
              : 'bg-white text-[#71717A] hover:bg-[#F7F5F0] border border-[#E5E2DE]'
          }`}
        >
          <Users size={15} />
          <span>Employees &amp; Logins</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-md bg-[#C49A6C]/20 text-[#C49A6C] text-[10px]">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('SALES_REPORT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SALES_REPORT'
              ? 'bg-[#211F1C] text-white shadow-subtle'
              : 'bg-white text-[#71717A] hover:bg-[#F7F5F0] border border-[#E5E2DE]'
          }`}
        >
          <TrendingUp size={15} />
          <span>Staff Sales Monitoring &amp; Report</span>
        </button>

        <button
          onClick={() => setActiveTab('SALARY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SALARY'
              ? 'bg-[#211F1C] text-white shadow-subtle'
              : 'bg-white text-[#71717A] hover:bg-[#F7F5F0] border border-[#E5E2DE]'
          }`}
        >
          <IndianRupee size={15} />
          <span>Salary &amp; Advance Management</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'bg-[#211F1C] text-white shadow-subtle'
              : 'bg-white text-[#71717A] hover:bg-[#F7F5F0] border border-[#E5E2DE]'
          }`}
        >
          <CalendarDays size={15} />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('CASH_REGISTER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CASH_REGISTER'
              ? 'bg-[#211F1C] text-white shadow-subtle'
              : 'bg-white text-[#71717A] hover:bg-[#F7F5F0] border border-[#E5E2DE]'
          }`}
        >
          <Banknote size={15} />
          <span>Cash Drawer (Galla Register)</span>
          {activeTodayRegister && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: EMPLOYEES & STAFF ACCOUNTS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Total Employees</span>
              <p className="font-serif text-2xl font-black text-[#211F1C] mt-1">{employees.length}</p>
              <p className="text-xs text-[#71717A] mt-1">Showroom Sales &amp; Cashiers</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Active Staff</span>
              <p className="font-serif text-2xl font-black text-emerald-600 mt-1">
                {employees.filter((e) => e.is_active !== false).length}
              </p>
              <p className="text-xs text-[#71717A] mt-1">Authorized for device login</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Selling Today</span>
              <p className="font-serif text-2xl font-black text-[#C49A6C] mt-1">
                {employees.filter((e) => e.is_selling_today).length}
              </p>
              <p className="text-xs text-[#71717A] mt-1">Generated bills on counter today</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Monthly Salary Budget</span>
              <p className="font-serif text-2xl font-black text-[#211F1C] mt-1">
                {fmt(employees.reduce((acc, e) => acc + Number(e.base_salary || e.monthly_salary || 0), 0))}
              </p>
              <p className="text-xs text-[#71717A] mt-1">Total monthly payroll</p>
            </div>
          </div>

          {/* Notice Banner: 1 Admin + 2 Staff Setup & Safe Data Retention */}
          <div className="bg-[#FAF7F2] border border-[#E5E2DE] p-4 rounded-2xl flex items-start gap-3 shadow-subtle">
            <ShieldCheck size={20} className="text-[#C49A6C] shrink-0 mt-0.5" />
            <div className="text-xs text-[#211F1C] space-y-0.5">
              <span className="font-bold text-[#C49A6C] uppercase tracking-wider block text-[10px]">
                Showroom Staff Policy (1 Admin + 2 Staff &bull; 100% Data Protection)
              </span>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Showroom me default me <strong>2 Staff Login</strong> (Staff 1: <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E2DE] font-bold text-[#211F1C]">staff01</code> aur Staff 2: <code className="bg-white px-1.5 py-0.5 rounded border border-[#E5E2DE] font-bold text-[#211F1C]">staff02</code>) aur <strong>1 Admin</strong> login hai. Agar showroom me koi naya staff add hoga to <strong>"+ Add Employee"</strong> se add hone ke baad wo bhi login kar sakega.
              </p>
              <p className="text-xs text-amber-800 font-semibold pt-0.5">
                &bull; Agar koi staff showroom chhod deta hai to unka data Admin se kabhi delete nahi hoga &mdash; unke sabhi purane bills, sales aur collection hamesha Admin me surakshit rahenge.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A39E98]" />
              <input
                type="text"
                placeholder="Search staff by name, code, phone or Login ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
              />
            </div>
            <button
              onClick={() => setIsAddEmployeeModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all shrink-0"
            >
              <Plus size={15} /> Add Employee
            </button>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F5F0] border-b border-[#E5E2DE] text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Contact &amp; Address</th>
                    <th className="py-3 px-4">Login ID</th>
                    <th className="py-3 px-4 text-right">Monthly Salary</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#71717A]">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#C49A6C]" />
                        Loading employee records...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#71717A]">
                        <Users size={32} className="mx-auto mb-2 text-[#A39E98] opacity-50" />
                        No employees found. Click "+ Add Employee" to create your first staff account.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#211F1C] flex items-center gap-2">
                            <span>{emp.name}</span>
                            {isPrimaryOwnerEmployee(emp) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#C49A6C]/20 text-[#8B5E2E] border border-[#C49A6C]/40">
                                Primary Owner
                              </span>
                            )}
                            {emp.is_selling_today && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                                Selling Today
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#71717A] flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[#C49A6C] font-semibold">{emp.employee_code}</span>
                            <span>•</span>
                            <span>{emp.designation || 'Sales Staff'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-[#211F1C] font-semibold">
                            <Phone size={13} className="text-[#C49A6C]" />
                            <span>{emp.phone}</span>
                          </div>
                          {emp.address && (
                            <div className="text-[11px] text-[#71717A] flex items-center gap-1 mt-0.5 max-w-xs truncate">
                              <MapPin size={11} className="text-[#A39E98] shrink-0" />
                              <span className="truncate">{emp.address}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#211F1C] bg-[#F7F5F0] px-2 py-1 rounded-lg border border-[#E5E2DE]">
                            {emp.username || emp.employee_code?.toLowerCase() || 'No Login'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-serif font-bold text-[#211F1C]">
                          {fmt(emp.base_salary || emp.monthly_salary)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {emp.is_active !== false ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ACTIVE (Login On)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-stone-100 text-stone-600 border border-stone-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                              LEFT SHOP (Data Safe)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Employee */}
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setEditEmployeeForm({
                                  name: emp.name || '',
                                  phone: emp.phone || '',
                                  username: emp.username || '',
                                  password: '',
                                  address: emp.address || '',
                                  monthly_salary: emp.base_salary || emp.monthly_salary || 15000,
                                  designation: emp.designation || 'Sales Executive',
                                  joining_date: emp.joining_date || '',
                                  email: emp.email || ''
                                });
                                setIsEditEmployeeModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#211F1C] hover:bg-white border border-[#E5E2DE] transition-all"
                              title="Edit Employee Info"
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Permissions, Reset Password, and Deactivate are locked for Primary Owner */}
                            {!isPrimaryOwnerEmployee(emp) ? (
                              <>
                                {/* Permissions */}
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setPermissionsForm({
                                      can_manage_sales: emp.can_manage_sales !== false,
                                      can_edit_sales: emp.can_edit_sales || false,
                                      can_give_discount: emp.can_give_discount !== false,
                                      can_print_invoices: emp.can_print_invoices !== false,
                                      can_manage_customers: emp.can_manage_customers !== false,
                                      can_view_inventory: emp.can_view_inventory !== false,
                                      can_adjust_stock: emp.can_adjust_stock || false,
                                      can_view_emi: emp.can_view_emi !== false,
                                      can_collect_emi: emp.can_collect_emi !== false,
                                      can_manage_attendance: emp.can_manage_attendance !== false
                                    });
                                    setIsPermissionsModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-[#C49A6C] hover:bg-[#C49A6C]/10 border border-[#C49A6C]/30 transition-all"
                                  title="Manage Permissions"
                                >
                                  <ShieldCheck size={14} />
                                </button>

                                {/* Reset Password */}
                                <button
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setResetPasswordForm({ new_password: '' });
                                    setIsResetPasswordModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 border border-amber-200 transition-all"
                                  title="Reset Password"
                                >
                                  <KeyRound size={14} />
                                </button>

                                {/* Left Shop / Reactivate (100% Data Preservation) */}
                                {emp.is_active !== false ? (
                                  <button
                                    onClick={() => handleMarkLeftShop(emp)}
                                    className="px-2 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1 text-[10px] font-bold"
                                    title="Staff chhod diya? (Login band hoga, purana data Admin me 100% safe rahega)"
                                  >
                                    <UserX size={14} />
                                    <span className="hidden sm:inline">Chhod Diya</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleMarkLeftShop(emp)}
                                    className="px-2 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-all flex items-center gap-1 text-[10px] font-bold"
                                    title="Wapas Rejoin karein (Chalu karein)"
                                  >
                                    <UserCheck size={14} />
                                    <span className="hidden sm:inline">Rejoin</span>
                                  </button>
                                )}

                                {/* Delete Permanently */}
                                <button
                                  onClick={() => handleDeleteEmployeePermanently(emp)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all"
                                  title="Delete Employee Permanently"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <span
                                className="px-2 py-1 rounded-lg bg-[#F7F5F0] text-[#8B5E2E] border border-[#C49A6C]/40 text-[10px] font-bold inline-flex items-center gap-1"
                                title="Primary Owner login credentials are protected from Staff Management resets"
                              >
                                <ShieldCheck size={12} />
                                Protected
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: STAFF SALES MONITORING & REPORT (ADMIN DASHBOARD)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'SALES_REPORT' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#211F1C]">Employee Sales &amp; Collection Report</h3>
                <p className="text-[11px] text-[#71717A]">
                  Track individual employee daily/monthly sales, products sold, cash vs online collection.
                </p>
              </div>

              {/* Date Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setReportFilterType('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilterType === 'today'
                      ? 'bg-[#211F1C] text-white shadow-xs'
                      : 'bg-[#F7F5F0] text-[#71717A] hover:bg-[#EEE6DB]'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setReportFilterType('yesterday')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilterType === 'yesterday'
                      ? 'bg-[#211F1C] text-white shadow-xs'
                      : 'bg-[#F7F5F0] text-[#71717A] hover:bg-[#EEE6DB]'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  onClick={() => setReportFilterType('this_month')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilterType === 'this_month'
                      ? 'bg-[#211F1C] text-white shadow-xs'
                      : 'bg-[#F7F5F0] text-[#71717A] hover:bg-[#EEE6DB]'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setReportFilterType('custom')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    reportFilterType === 'custom'
                      ? 'bg-[#211F1C] text-white shadow-xs'
                      : 'bg-[#F7F5F0] text-[#71717A] hover:bg-[#EEE6DB]'
                  }`}
                >
                  Custom Date
                </button>

                {/* Employee Filter */}
                <select
                  value={selectedReportEmployeeId}
                  onChange={(e) => setSelectedReportEmployeeId(e.target.value)}
                  className="px-3 py-1.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold text-[#211F1C] focus:outline-none"
                >
                  <option value="">All Staff &amp; Counters</option>
                  <option value="0">Shop Owner (Direct Counter)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code})
                    </option>
                  ))}
                </select>

                <button
                  onClick={loadSalesReport}
                  className="p-2 rounded-xl bg-[#F7F5F0] hover:bg-[#EEE6DB] text-[#211F1C] transition-all"
                  title="Refresh Report"
                >
                  <RefreshCw size={15} className={reportLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Custom Date Inputs if selected */}
            {reportFilterType === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E5E2DE]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#71717A] uppercase">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#71717A] uppercase">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>
                <button
                  onClick={loadSalesReport}
                  className="px-4 py-1.5 rounded-xl bg-[#211F1C] text-white text-xs font-bold hover:bg-[#C49A6C] hover:text-[#211F1C] transition-all"
                >
                  Apply Date Filter
                </button>
              </div>
            )}
          </div>

          {/* Grand Totals Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Total Sales</span>
              <p className="font-serif text-xl font-black text-[#211F1C] mt-1">
                {fmt(salesReportData?.grand_totals?.total_sales)}
              </p>
              <span className="text-[10px] text-[#71717A]">{salesReportData?.grand_totals?.total_bills || 0} Bills</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Cash Collection</span>
              <p className="font-serif text-xl font-black text-amber-700 mt-1">
                {fmt(salesReportData?.grand_totals?.cash_collection)}
              </p>
              <span className="text-[10px] text-[#71717A]">In showroom drawer</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Online / UPI Collection</span>
              <p className="font-serif text-xl font-black text-indigo-700 mt-1">
                {fmt(salesReportData?.grand_totals?.online_collection)}
              </p>
              <span className="text-[10px] text-[#71717A]">Direct bank / QR</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Collection</span>
              <p className="font-serif text-xl font-black text-emerald-800 mt-1">
                {fmt(salesReportData?.grand_totals?.total_collection)}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold">Cash + UPI Received</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Products Sold</span>
              <p className="font-serif text-xl font-black text-[#211F1C] mt-1">
                {salesReportData?.grand_totals?.total_products_sold || 0}
              </p>
              <span className="text-[10px] text-[#71717A]">Furniture items</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Total Invoices</span>
              <p className="font-serif text-xl font-black text-[#211F1C] mt-1">
                {salesReportData?.grand_totals?.total_bills || 0}
              </p>
              <span className="text-[10px] text-[#71717A]">Completed sales</span>
            </div>
          </div>

          {/* Combined Staff Sales Summary Card */}
          {salesReportData?.combined_staff_totals && (
            <div className="bg-[#211F1C] text-white p-5 rounded-2xl border border-[#C49A6C]/30 shadow-gold-glow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C49A6C]">
                    ALL STAFF MEMBERS COMBINED
                  </span>
                  <h4 className="font-serif text-lg font-bold text-white">
                    Combined Staff Sales &amp; Collections
                  </h4>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#C49A6C]/20 text-[#C49A6C] text-xs font-bold">
                  {salesReportData.combined_staff_totals.total_bills} Total Bills Generated by Staff
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                <div>
                  <span className="text-[10px] text-[#A39E98] uppercase font-bold block">Combined Sales</span>
                  <p className="font-serif text-xl font-black text-white mt-0.5">
                    {fmt(salesReportData.combined_staff_totals.total_sales)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#A39E98] uppercase font-bold block">Products Sold</span>
                  <p className="font-serif text-xl font-black text-[#C49A6C] mt-0.5">
                    {salesReportData.combined_staff_totals.total_products_sold} units
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#A39E98] uppercase font-bold block">Cash Collected</span>
                  <p className="font-serif text-xl font-black text-amber-400 mt-0.5">
                    {fmt(salesReportData.combined_staff_totals.cash_collection)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#A39E98] uppercase font-bold block">Online / UPI Collected</span>
                  <p className="font-serif text-xl font-black text-indigo-300 mt-0.5">
                    {fmt(salesReportData.combined_staff_totals.online_collection)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#A39E98] uppercase font-bold block">Total Staff Collection</span>
                  <p className="font-serif text-xl font-black text-emerald-400 mt-0.5">
                    {fmt(salesReportData.combined_staff_totals.total_collection)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee-wise Sales Table */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="p-4 bg-[#F7F5F0] border-b border-[#E5E2DE] flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-xs text-[#211F1C]">Employee Sales Breakdown</h4>
                <p className="text-[10px] text-[#71717A]">Compare performance and collections per staff member</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E2DE] text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3 text-right">Today's Sales</th>
                    <th className="py-3 px-3 text-right">Monthly Sales</th>
                    <th className="py-3 px-3 text-right">Selected Period Sales</th>
                    <th className="py-3 px-3 text-center">Products Sold</th>
                    <th className="py-3 px-3 text-right">Cash Received</th>
                    <th className="py-3 px-3 text-right">Online Received</th>
                    <th className="py-3 px-4 text-right">Total Collection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {reportLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#71717A]">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#C49A6C]" />
                        Calculating employee sales records...
                      </td>
                    </tr>
                  ) : (salesReportData?.employee_reports || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#71717A]">
                        No sales data found for the selected filter period.
                      </td>
                    </tr>
                  ) : (
                    (salesReportData?.employee_reports || []).map((rep) => (
                      <tr key={rep.employee_id} className="hover:bg-[#F7F5F0]/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#211F1C]">{rep.employee_name}</div>
                          <div className="text-[10px] text-[#71717A] flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[#C49A6C] font-semibold">{rep.employee_code}</span>
                            <span>•</span>
                            <span>{rep.designation}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-[#211F1C]">
                          {fmt(rep.today_sales)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-[#211F1C]">
                          {fmt(rep.monthly_sales)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-[#C49A6C]">
                          {fmt(rep.filtered_sales)}
                          <span className="block text-[9px] font-sans font-normal text-[#71717A]">
                            {rep.bills_count} bills
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-[#211F1C]">
                          {rep.total_products_sold} <span className="text-[10px] text-[#71717A]">pcs</span>
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-amber-700">
                          {fmt(rep.cash_collection)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-indigo-700">
                          {fmt(rep.online_collection)}
                        </td>
                        <td className="py-3 px-4 text-right font-serif font-black text-emerald-700 bg-emerald-50/30">
                          {fmt(rep.total_collection)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Sales Inspection Table */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="p-4 bg-[#F7F5F0] border-b border-[#E5E2DE] flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-xs text-[#211F1C]">Sales Transaction Inspection</h4>
                <p className="text-[10px] text-[#71717A]">
                  Click on any invoice to view employee attribution, customer, products, and split payment details.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E2DE] text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Invoice / Date</th>
                    <th className="py-3 px-4">Sold By (Staff)</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3 text-right">Bill Total</th>
                    <th className="py-3 px-3 text-right">Cash Recd</th>
                    <th className="py-3 px-3 text-right">Online Recd</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {(salesReportData?.sales_inspection || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#71717A]">
                        No invoices found for this date filter.
                      </td>
                    </tr>
                  ) : (
                    (salesReportData?.sales_inspection || []).map((sale) => (
                      <tr key={sale.id} className={`hover:bg-[#F7F5F0]/60 transition-colors ${sale.is_cancelled ? 'opacity-60 bg-rose-50/20' : ''}`}>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#211F1C] block">{sale.invoice_number}</span>
                          <span className="text-[10px] text-[#71717A]">{sale.sale_date}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#211F1C] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#C49A6C]"></span>
                            <span>{sale.employee_name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#71717A] ml-3.5">{sale.employee_code}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#211F1C] block">{sale.customer_name}</span>
                          <span className="text-[10px] text-[#71717A]">{sale.customer_phone}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-black text-[#211F1C]">
                          {fmt(sale.grand_total)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-amber-700">
                          {fmt(sale.cash_received)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-indigo-700">
                          {fmt(sale.online_received)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              sale.is_cancelled
                                ? 'bg-rose-100 text-rose-700'
                                : sale.balance_amount <= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sale.is_cancelled ? 'CANCELLED' : (sale.balance_amount <= 0 ? 'PAID' : 'PARTIAL')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setInspectedSale(sale)}
                            className="px-3 py-1 rounded-lg bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-[11px] font-bold transition-all shadow-xs inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View Bill
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: SALARY & ADVANCE MANAGEMENT (ADMIN ONLY)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'SALARY' && (
        <div className="space-y-6">
          {/* Header & Month Filter */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#211F1C]">Monthly Salary &amp; Advance Management</h3>
              <p className="text-[11px] text-[#71717A]">
                Record salary disbursements, deduct employee advances, and track paid vs pending balance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">Month:</span>
                <input
                  type="text"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  placeholder="e.g. November 2026"
                  className="px-3 py-1.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold text-[#211F1C]"
                />
              </div>

              <button
                onClick={() => {
                  setSalaryPaymentForm({
                    employee_id: employees[0]?.id || '',
                    month: salaryMonth,
                    record_type: 'SALARY',
                    monthly_salary: employees[0]?.base_salary || 15000,
                    advance_amount: 0,
                    amount_paid: employees[0]?.base_salary || 15000,
                    payment_mode: 'CASH',
                    payment_date: new Date().toISOString().slice(0, 10),
                    notes: ''
                  });
                  setIsRecordSalaryModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all shadow-subtle shrink-0"
              >
                <Plus size={15} /> Record Salary / Advance
              </button>
            </div>
          </div>

          {/* Salary Summaries Table */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="p-4 bg-[#F7F5F0] border-b border-[#E5E2DE]">
              <h4 className="font-serif font-bold text-xs text-[#211F1C]">
                {salaryMonth} Payroll Status
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E2DE] text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3 text-right">Monthly Salary</th>
                    <th className="py-3 px-3 text-right">Advance Taken</th>
                    <th className="py-3 px-3 text-right">Salary Paid</th>
                    <th className="py-3 px-3 text-right">Remaining Salary</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {salaryLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#71717A]">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#C49A6C]" />
                        Loading salary records...
                      </td>
                    </tr>
                  ) : (salaryData?.employee_summaries || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#71717A]">
                        No employee salary records found.
                      </td>
                    </tr>
                  ) : (
                    (salaryData?.employee_summaries || []).map((summary) => (
                      <tr key={summary.employee_id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#211F1C] block">{summary.employee_name}</span>
                          <span className="text-[10px] font-mono text-[#71717A]">{summary.employee_code} • {summary.phone}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-[#211F1C]">
                          {fmt(summary.monthly_salary)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-rose-600">
                          {fmt(summary.advance_taken)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-emerald-700">
                          {fmt(summary.salary_paid)}
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-amber-700">
                          {fmt(summary.remaining_salary)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              summary.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : summary.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {summary.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSalaryPaymentForm({
                                employee_id: summary.employee_id,
                                month: salaryMonth,
                                record_type: 'SALARY',
                                monthly_salary: summary.monthly_salary,
                                advance_amount: summary.advance_taken,
                                amount_paid: summary.remaining_salary > 0 ? summary.remaining_salary : summary.monthly_salary,
                                payment_mode: 'CASH',
                                payment_date: new Date().toISOString().slice(0, 10),
                                notes: ''
                              });
                              setIsRecordSalaryModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all"
                          >
                            Pay / Advance
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History Log */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="p-4 bg-[#F7F5F0] border-b border-[#E5E2DE]">
              <h4 className="font-serif font-bold text-xs text-[#211F1C]">Payment History Log</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E2DE] text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Amount Paid</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {(salaryData?.records || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#71717A]">
                        No payment records logged yet.
                      </td>
                    </tr>
                  ) : (
                    (salaryData?.records || []).map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                        <td className="py-3 px-4 text-[#71717A]">
                          {rec.payment_date}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#211F1C]">
                          {rec.employee_name} ({rec.employee_code})
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.record_type === 'ADVANCE'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {rec.record_type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-[#211F1C]">
                          {fmt(rec.amount_paid)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#71717A]">
                          {rec.payment_mode}
                        </td>
                        <td className="py-3 px-4 text-[#71717A] max-w-xs truncate">
                          {rec.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: ATTENDANCE MANAGEMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6">
          {/* Admin Mark Attendance Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
            <h3 className="font-serif font-bold text-sm text-[#211F1C] mb-1">Mark / Edit Daily Attendance</h3>
            <p className="text-[11px] text-[#71717A] mb-4">
              Select date and employee to record Present, Absent, Half Day or Leave.
            </p>

            <form onSubmit={handleAdminMarkAttendance} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Date *</label>
                <input
                  type="date"
                  value={adminMarkDate}
                  onChange={(e) => setAdminMarkDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Employee *</label>
                <select
                  value={adminMarkEmployeeId}
                  onChange={(e) => setAdminMarkEmployeeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Status *</label>
                <select
                  value={adminMarkStatus}
                  onChange={(e) => {
                    const st = e.target.value;
                    setAdminMarkStatus(st);
                    if (st === 'PRESENT') setAdminMarkHours('8.00');
                    else if (st === 'HALF_DAY') setAdminMarkHours('4.00');
                    else setAdminMarkHours('0.00');
                  }}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                >
                  <option value="PRESENT">Present (Full Day)</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Regular showroom shift"
                  value={adminMarkNotes}
                  onChange={(e) => setAdminMarkNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#C49A6C] hover:bg-[#B38758] text-[#211F1C] font-bold text-xs rounded-xl transition-all shadow-gold-glow"
                >
                  {submitting ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Present Shifts</span>
              <p className="font-serif text-2xl font-black text-emerald-600 mt-1">{attendanceSummary.days_present}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Half Days</span>
              <p className="font-serif text-2xl font-black text-amber-600 mt-1">{attendanceSummary.days_half_day}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Leaves / Absent</span>
              <p className="font-serif text-2xl font-black text-rose-600 mt-1">{attendanceSummary.days_leave}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Total Hours Logged</span>
              <p className="font-serif text-2xl font-black text-[#211F1C] mt-1">{attendanceSummary.total_hours} hrs</p>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="p-4 bg-[#F7F5F0] border-b border-[#E5E2DE] flex items-center justify-between">
              <h4 className="font-serif font-bold text-xs text-[#211F1C]">Recent Attendance Records</h4>
              {attendanceRecords.length > 0 && (
                <button
                  onClick={handleClearAllAttendance}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all"
                  title="Clear all attendance records"
                >
                  <Trash2 size={13} /> Clear All Attendance
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E2DE] text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Check-in Time</th>
                    <th className="py-3 px-3 text-center">Check-out Time</th>
                    <th className="py-3 px-3 text-center">Hours</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#71717A]">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#C49A6C]" />
                        Loading attendance history...
                      </td>
                    </tr>
                  ) : attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#71717A]">
                        No attendance records logged yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((att) => (
                      <tr key={att.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#211F1C]">{att.date}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#211F1C] block">{att.employee_name}</span>
                          <span className="text-[10px] font-mono text-[#71717A]">{att.employee_code}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              att.status === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'HALF_DAY'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-[#71717A]">{att.check_in_time || '—'}</td>
                        <td className="py-3 px-3 text-center text-[#71717A]">{att.check_out_time || '—'}</td>
                        <td className="py-3 px-3 text-center font-bold text-[#211F1C]">{att.working_hours || '0'} hrs</td>
                        <td className="py-3 px-4 text-[#71717A]">{att.notes || '—'}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteAttendance(att)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all"
                            title="Delete attendance record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 5: CASH DRAWER / GALLA REGISTER
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'CASH_REGISTER' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Today Cash Counter</span>
              <p className="font-serif text-2xl font-black text-[#211F1C] mt-1">
                {activeTodayRegister ? 'OPEN (Active)' : 'CLOSED'}
              </p>
              <span className="text-xs text-[#71717A]">
                {activeTodayRegister ? `Opened with ${fmt(activeTodayRegister.opening_balance)}` : 'Drawer tally completed'}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Today's Cash In Counter</span>
              <p className="font-serif text-2xl font-black text-amber-700 mt-1">
                {fmt(activeTodayRegister?.expected_cash || 0)}
              </p>
              <span className="text-xs text-[#71717A]">Opening Balance + Cash Sales</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E5E2DE] shadow-subtle">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Actions</span>
              <div className="mt-2">
                {!activeTodayRegister ? (
                  <button
                    onClick={() => {
                      setOpenRegForm({
                        employee_id: employees[0]?.id || '',
                        opening_balance: 2000,
                        notes: 'Morning shift opening cash'
                      });
                      setIsOpenRegisterModal(true);
                    }}
                    className="w-full py-2 bg-[#C49A6C] hover:bg-[#B38758] text-[#211F1C] font-bold text-xs rounded-xl shadow-gold-glow flex items-center justify-center gap-1.5"
                  >
                    <Unlock size={14} /> Open Counter Drawer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRegisterToClose(activeTodayRegister);
                      setCloseRegForm({
                        closing_cash: activeTodayRegister.expected_cash || activeTodayRegister.opening_balance,
                        notes: ''
                      });
                      setIsCloseRegisterModal(true);
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-subtle flex items-center justify-center gap-1.5"
                  >
                    <Lock size={14} /> Close Counter &amp; Tally
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cash Registers History Table */}
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-subtle overflow-hidden">
            <div className="p-4 bg-[#F7F5F0] border-b border-[#E5E2DE]">
              <h4 className="font-serif font-bold text-xs text-[#211F1C]">Daily Drawer Registers History</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E5E2DE] text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Counter Executive</th>
                    <th className="py-3 px-3 text-right">Opening Bal</th>
                    <th className="py-3 px-3 text-right">Cash Sales</th>
                    <th className="py-3 px-3 text-right">Expected Cash</th>
                    <th className="py-3 px-3 text-right">Counted Cash</th>
                    <th className="py-3 px-3 text-right">Difference</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DE] text-xs">
                  {registers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#71717A]">
                        No register logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    registers.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F7F5F0]/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#211F1C]">
                          {r.register_date || r.date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#211F1C]">
                          {r.employee_name || 'Showroom Cashier'}
                        </td>
                        <td className="py-3 px-3 text-right font-serif">{fmt(r.opening_balance)}</td>
                        <td className="py-3 px-3 text-right font-serif text-amber-700 font-bold">{fmt(r.cash_sales)}</td>
                        <td className="py-3 px-3 text-right font-serif font-bold">{fmt(r.expected_cash)}</td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-emerald-700">
                          {r.closing_cash !== null ? fmt(r.closing_cash) : '—'}
                        </td>
                        <td className={`py-3 px-3 text-right font-serif font-bold ${Number(r.difference) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.closing_cash !== null ? fmt(r.difference) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              r.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: ADD NEW EMPLOYEE (SIMPLE, PROFESSIONAL)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isAddEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#C49A6C]" />
                <h3 className="font-serif text-base font-bold text-white">Add New Employee</h3>
              </div>
              <button onClick={() => setIsAddEmployeeModalOpen(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[#71717A]">
                Create a login account for your employee. They will be able to log in from their mobile, laptop or tablet to record sales.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
                    value={addEmployeeForm.name}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={addEmployeeForm.phone}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={addEmployeeForm.joining_date}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, joining_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Monthly Salary (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="15000"
                    value={addEmployeeForm.monthly_salary}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, monthly_salary: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Login ID (Username) *
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    required
                    placeholder="e.g. rahul_sales"
                    value={addEmployeeForm.username}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    placeholder="Enter login password"
                    value={addEmployeeForm.password}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chas Main Road, Bokaro"
                    value={addEmployeeForm.address}
                    onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
                  />
                </div>
              </div>

              {/* Employee Permissions Control */}
              <div className="pt-3 border-t border-[#E5E2DE]">
                <h4 className="text-xs font-bold text-[#211F1C] uppercase tracking-wider mb-2">
                  Employee Permissions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-[#F7F5F0] rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addEmployeeForm.can_manage_sales}
                      onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, can_manage_sales: e.target.checked })}
                      className="accent-[#C49A6C]"
                    />
                    <span className="font-semibold text-[#211F1C]">Can Make Sales &amp; Billing</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#F7F5F0] rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addEmployeeForm.can_collect_emi}
                      onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, can_collect_emi: e.target.checked })}
                      className="accent-[#C49A6C]"
                    />
                    <span className="font-semibold text-[#211F1C]">Can Collect Customer EMI</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#F7F5F0] rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addEmployeeForm.can_view_inventory}
                      onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, can_view_inventory: e.target.checked })}
                      className="accent-[#C49A6C]"
                    />
                    <span className="font-semibold text-[#211F1C]">Can View Product Inventory</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-[#F7F5F0] rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addEmployeeForm.can_manage_customers}
                      onChange={(e) => setAddEmployeeForm({ ...addEmployeeForm, can_manage_customers: e.target.checked })}
                      className="accent-[#C49A6C]"
                    />
                    <span className="font-semibold text-[#211F1C]">Can View / Add Customers</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A] hover:bg-[#F7F5F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#C49A6C] hover:bg-[#B38758] text-[#211F1C] text-xs font-bold shadow-gold-glow"
                >
                  {submitting ? 'Creating...' : 'Save & Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: EDIT EMPLOYEE INFO
      ═══════════════════════════════════════════════════════════════════════ */}
      {isEditEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <h3 className="font-serif text-sm font-bold text-white">Edit Employee: {selectedEmployee?.name}</h3>
              <button onClick={() => setIsEditEmployeeModalOpen(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditEmployeeSubmit} autoComplete="off" className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Full Name (Staff Name)</label>
                <input
                  type="text"
                  required
                  value={editEmployeeForm.name}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold"
                  placeholder="e.g. Ramesh Kumar or Rahul"
                />
                <span className="text-[10px] text-[#A39E98] mt-0.5 block">
                  Whatever name you enter here will automatically show on the Login page button.
                </span>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Login ID (Username)</label>
                <input
                  type="text"
                  autoComplete="off"
                  disabled={isPrimaryOwnerEmployee(selectedEmployee)}
                  value={editEmployeeForm.username}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono font-bold disabled:opacity-60"
                  placeholder="e.g. staff01 or ramesh"
                />
              </div>
              {!isPrimaryOwnerEmployee(selectedEmployee) ? (
                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                    Change Login Password <span className="text-[#A39E98] font-normal normal-case">(Leave blank to keep current)</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="new-password"
                    value={editEmployeeForm.password || ''}
                    onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono"
                    placeholder="Enter new password (optional)"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                  Primary Store Owner username and password are protected and cannot be changed here.
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={editEmployeeForm.phone}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Monthly Salary (₹)</label>
                <input
                  type="number"
                  required
                  value={editEmployeeForm.monthly_salary}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, monthly_salary: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={editEmployeeForm.address}
                  onChange={(e) => setEditEmployeeForm({ ...editEmployeeForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsEditEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold"
                >
                  {submitting ? 'Saving...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: PERMISSIONS MANAGEMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {isPermissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#C49A6C]" />
                <h3 className="font-serif text-sm font-bold text-white">Permissions: {selectedEmployee?.name}</h3>
              </div>
              <button onClick={() => setIsPermissionsModalOpen(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePermissionsSubmit} className="p-5 space-y-3">
              <p className="text-xs text-[#71717A]">
                Enable or disable modules for this employee. Restricted areas (Profit &amp; Loss, Settings, other staff salaries) are always completely blocked.
              </p>

              <div className="space-y-2 text-xs">
                {[
                  { key: 'can_manage_sales', label: 'Make Sales & Billing', desc: 'Create sales, add items, and record payments' },
                  { key: 'can_collect_emi', label: 'Collect Customer EMI', desc: 'Accept installments & print receipts' },
                  { key: 'can_view_inventory', label: 'View Stock & Inventory', desc: 'View steel, wooden and plastic stock availability' },
                  { key: 'can_manage_customers', label: 'Customer Management', desc: 'Add new customers & view contact directory' },
                  { key: 'can_give_discount', label: 'Discount Authority', desc: 'Permit giving bill discounts to customers' },
                  { key: 'can_print_invoices', label: 'Print Invoices', desc: 'Allow printing GST Tax Invoice / Estimate slips' },
                ].map((perm) => (
                  <label key={perm.key} className="flex items-start gap-3 p-2.5 bg-[#F7F5F0] rounded-xl cursor-pointer hover:bg-[#EEE6DB]/60">
                    <input
                      type="checkbox"
                      checked={!!permissionsForm[perm.key]}
                      onChange={(e) => setPermissionsForm({ ...permissionsForm, [perm.key]: e.target.checked })}
                      className="accent-[#C49A6C] mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-[#211F1C] block">{perm.label}</span>
                      <span className="text-[11px] text-[#71717A]">{perm.desc}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold"
                >
                  {submitting ? 'Updating...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: RESET PASSWORD
      ═══════════════════════════════════════════════════════════════════════ */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-[#C49A6C]" />
                <h3 className="font-serif text-sm font-bold text-white">Reset Password: {selectedEmployee?.name}</h3>
              </div>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit} autoComplete="off" className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Enter new password for employee"
                  value={resetPasswordForm.new_password}
                  onChange={(e) => setResetPasswordForm({ new_password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  {submitting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 5: RECORD SALARY / ADVANCE
      ═══════════════════════════════════════════════════════════════════════ */}
      {isRecordSalaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2">
                <IndianRupee size={16} className="text-[#C49A6C]" />
                <h3 className="font-serif text-sm font-bold text-white">Record Salary / Advance Payment</h3>
              </div>
              <button onClick={() => setIsRecordSalaryModalOpen(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordSalarySubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Employee *</label>
                  <select
                    value={salaryPaymentForm.employee_id}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((x) => String(x.id) === String(empId));
                      setSalaryPaymentForm({
                        ...salaryPaymentForm,
                        employee_id: empId,
                        monthly_salary: emp?.base_salary || 15000,
                        amount_paid: emp?.base_salary || 15000
                      });
                    }}
                    required
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code}) - Base: {fmt(emp.base_salary)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Payment Type</label>
                  <select
                    value={salaryPaymentForm.record_type}
                    onChange={(e) => setSalaryPaymentForm({ ...salaryPaymentForm, record_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  >
                    <option value="SALARY">Monthly Salary</option>
                    <option value="ADVANCE">Advance Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Salary Month</label>
                  <input
                    type="text"
                    value={salaryPaymentForm.month}
                    onChange={(e) => setSalaryPaymentForm({ ...salaryPaymentForm, month: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Amount Paid (₹) *</label>
                  <input
                    type="number"
                    required
                    value={salaryPaymentForm.amount_paid}
                    onChange={(e) => setSalaryPaymentForm({ ...salaryPaymentForm, amount_paid: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Payment Mode</label>
                  <select
                    value={salaryPaymentForm.payment_mode}
                    onChange={(e) => setSalaryPaymentForm({ ...salaryPaymentForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={salaryPaymentForm.payment_date}
                    onChange={(e) => setSalaryPaymentForm({ ...salaryPaymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid in cash at showroom"
                    value={salaryPaymentForm.notes}
                    onChange={(e) => setSalaryPaymentForm({ ...salaryPaymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsRecordSalaryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold shadow-subtle"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 6: SALE INSPECTION (FULL DETAILS)
      ═══════════════════════════════════════════════════════════════════════ */}
      {inspectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <div>
                <span className="text-[10px] font-mono text-[#C49A6C] font-bold">{inspectedSale.invoice_number}</span>
                <h3 className="font-serif text-sm font-bold text-white">Sale Inspection Details</h3>
              </div>
              <button onClick={() => setInspectedSale(null)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Cancellation Alert if Cancelled */}
              {inspectedSale.is_cancelled && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                    <AlertCircle size={14} /> Bill Cancelled &amp; Inventory Restored
                  </div>
                  <p className="text-[11px]">
                    This bill was cancelled on {inspectedSale.cancelled_at || 'earlier date'}.
                    {inspectedSale.cancellation_reason && (
                      <span className="block mt-0.5">Reason: <em>"{inspectedSale.cancellation_reason}"</em></span>
                    )}
                  </p>
                </div>
              )}

              {/* Attribution */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE]">
                <div>
                  <span className="text-[10px] font-bold text-[#71717A] uppercase block">Sold By (Staff Member)</span>
                  <span className="font-bold text-[#211F1C] text-sm">{inspectedSale.employee_name}</span>
                  <span className="text-[10px] font-mono text-[#C49A6C] block">{inspectedSale.employee_code}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#71717A] uppercase block">Customer Name</span>
                  <span className="font-bold text-[#211F1C] text-sm">{inspectedSale.customer_name}</span>
                  <span className="text-[10px] text-[#71717A] block">{inspectedSale.customer_phone}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-[#E5E2DE]">
                  <span className="text-[10px] font-bold text-[#71717A] uppercase block">Sale Date &amp; Time</span>
                  <span className="font-semibold text-[#211F1C]">{inspectedSale.sale_date}</span>
                </div>
              </div>

              {/* Products List with Category */}
              <div>
                <h4 className="font-serif font-bold text-xs text-[#211F1C] mb-2">
                  Products Sold ({inspectedSale.total_products_count} units)
                </h4>
                <div className="border border-[#E5E2DE] rounded-xl overflow-hidden divide-y divide-[#E5E2DE]">
                  {(inspectedSale.products || []).map((itm, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between bg-white text-xs">
                      <div>
                        <div className="font-bold text-[#211F1C] flex items-center gap-1.5">
                          <span>{itm.product_name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#C49A6C]/20 text-[#211F1C]">
                            {itm.category_name || 'Furniture'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#71717A]">
                          Qty: <strong>{itm.quantity}</strong> × {fmt(itm.unit_selling_price)}
                        </span>
                      </div>
                      <span className="font-serif font-bold text-[#211F1C]">{fmt(itm.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Reconciliation */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#71717A]">Total Bill:</span>
                  <span className="font-serif font-extrabold text-[#211F1C]">{fmt(inspectedSale.grand_total)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-800">
                  <span>Cash Received:</span>
                  <span className="font-serif font-bold">{fmt(inspectedSale.cash_received)}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-800">
                  <span>Online / UPI Received:</span>
                  <span className="font-serif font-bold">{fmt(inspectedSale.online_received)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-700 font-bold pt-1 border-t border-amber-200">
                  <span>Remaining Balance / Due:</span>
                  <span className="font-serif">{fmt(inspectedSale.balance_amount)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                {!inspectedSale.is_cancelled && (
                  <button
                    type="button"
                    onClick={() => handleCancelBill(inspectedSale)}
                    disabled={submitting}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-subtle flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} /> Cancel Bill &amp; Restore Stock
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedSale(null)}
                  className="w-full py-2.5 bg-[#211F1C] text-white rounded-xl font-bold text-xs hover:bg-[#C49A6C] hover:text-[#211F1C] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 7: OPEN CASH DRAWER
      ═══════════════════════════════════════════════════════════════════════ */}
      {isOpenRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-[#211F1C] text-white">
              <div className="flex items-center gap-2">
                <Unlock size={16} className="text-[#C49A6C]" />
                <h3 className="font-serif text-sm font-bold text-white">Open Cash Drawer</h3>
              </div>
              <button onClick={() => setIsOpenRegisterModal(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleOpenRegisterSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Opening Cash Balance (₹) *</label>
                <input
                  type="number"
                  required
                  value={openRegForm.opening_balance}
                  onChange={(e) => setOpenRegForm({ ...openRegForm, opening_balance: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">Counter Executive</label>
                <select
                  value={openRegForm.employee_id}
                  onChange={(e) => setOpenRegForm({ ...openRegForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                >
                  <option value="">Showroom Front Desk</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsOpenRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#C49A6C] text-[#211F1C] font-bold text-xs shadow-gold-glow"
                >
                  {submitting ? 'Opening...' : 'Confirm Open Drawer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 8: CLOSE CASH DRAWER (TALLY)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isCloseRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E5E2DE] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 bg-rose-700 text-white">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-white" />
                <h3 className="font-serif text-sm font-bold text-white">Close &amp; Tally Cash Counter</h3>
              </div>
              <button onClick={() => setIsCloseRegisterModal(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCloseRegisterSubmit} className="p-5 space-y-3">
              <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Opening Cash:</span>
                  <span className="font-bold">{fmt(selectedRegisterToClose?.opening_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#71717A]">Today Cash Sales:</span>
                  <span className="font-bold text-amber-700">{fmt(selectedRegisterToClose?.cash_sales)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-[#E5E2DE]">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-serif text-emerald-700">{fmt(selectedRegisterToClose?.expected_cash)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#71717A] uppercase mb-1">
                  Physically Counted Cash in Drawer (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={closeRegForm.closing_cash}
                  onChange={(e) => setCloseRegForm({ ...closeRegForm, closing_cash: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsCloseRegisterModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  {submitting ? 'Closing...' : 'Close & Tally Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;

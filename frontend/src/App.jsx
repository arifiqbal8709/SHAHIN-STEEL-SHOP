import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import Layout from './components/Layout';

// Core Pages
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import CreateBill from './pages/CreateBill';
import TaxInvoice from './pages/TaxInvoice';
import StockManagement from './pages/StockManagement';
import Customers from './pages/Customers';
import EMIManagement from './pages/EMIManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import AttendancePage from './pages/AttendancePage';
import MyProfile from './pages/MyProfile';
import InvoiceHistory from './pages/InvoiceHistory';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Protected Route Wrapper with Multi-Device Auth Check
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Layout>
        <div className="bg-white p-8 rounded-2xl border border-[#E5E2DE] text-center max-w-lg mx-auto my-12">
          <h2 className="font-serif text-xl font-bold text-rose-600 mb-2">Access Restricted</h2>
          <p className="text-xs text-[#71717A] mb-4">
            Your account ({user.role}) is not authorized to access this module. Please contact the showroom Owner.
          </p>
          <a href="/dashboard" className="px-4 py-2 bg-[#211F1C] text-white rounded-xl text-xs font-bold">
            Return to Dashboard
          </a>
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SyncProvider>
          <Routes>
            {/* Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Direct Dashboard Entry */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 1. Dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* 2. Sales & Invoices */}
            <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/sales/create" element={<ProtectedRoute><CreateBill /></ProtectedRoute>} />
            <Route path="/sales/tax-invoice" element={<ProtectedRoute><TaxInvoice /></ProtectedRoute>} />

            {/* 3. Inventory / Stock */}
            <Route path="/stock" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />

            {/* 4. Customer Management */}
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />

            {/* 6. EMI Management */}
            <Route path="/emi" element={<ProtectedRoute><EMIManagement /></ProtectedRoute>} />

            {/* 7. Attendance Management */}
            <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />

            {/* 8. Invoice History */}
            <Route path="/invoice-history" element={<ProtectedRoute><InvoiceHistory /></ProtectedRoute>} />

            {/* 9. My Profile (Staff & Owner) */}
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

            {/* 10. Staff & Cash Register Management (Owner & Accountant) */}
            <Route path="/employees" element={<ProtectedRoute allowedRoles={['OWNER', 'ACCOUNTANT']}><EmployeeManagement /></ProtectedRoute>} />

            {/* 11. Settings (Owner Only) */}
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['OWNER']}><Settings /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


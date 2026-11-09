# SHAHIN STEEL FURNITURE — Complete Shop Management System
### Production-Ready Multi-Device Showroom Operating Platform

Built with **React.js + Tailwind CSS** frontend, **Python Django REST Framework** backend, and **MySQL 8.0 Cloud Relational Database**.

---

## 🌟 Visual Theme & Design Inspiration
- **Dark Charcoal Sidebar**: `#211F1C` with warm subtle borders
- **Cream / Off-White Background**: `#F7F5F0`
- **Champagne Gold & Beige Accents**: `#C49A6C` & `#EEE6DB`
- **Showroom Hero Banner**: High-resolution furniture showroom photography
- **Professional Typography**: Playfair Display + Plus Jakarta Sans
- **Clean Modern Tables**: Rounded corners, subtle shadows, responsive drawer on mobile

---

## 🧭 12 Main Sidebar Modules
1. **Dashboard**: Daily, Weekly, Monthly, Yearly filters. Real-time Sales, Purchases, Revenue, Profit, Loss, Cash/UPI/Online collection, Total Inventory, Low Stock Alerts, and Pending EMI balance.
2. **Sales & Invoices**: Generate GST Tax Invoices (18%) and Estimate Bills. Product picker with stock validation, automatic line discounts, split payment reconciliation (Cash + UPI + Online + Bank Transfer), automatic inventory deduction, and printable A4 Tax Invoices.
3. **Inventory / Stock**: 3 core categories (**Plastic Items**, **Wooden Items**, **Steel Items**). Opening stock, inward, outward, adjustments, daily closing stock, movement history audit log, and low stock warnings.
4. **Purchases**: Consignments from Shahin Furniture Factory Unit-1 and external suppliers. Cost tracking, supplier payments, and automatic stock inward update.
5. **Customer Management**: Customer directory, contact details, total spent, purchase invoices, EMI accounts, and outstanding balances.
6. **Customer EMI Management**: Customer EMI financing accounts with linked sales invoice, product details, down payment, remaining balance, monthly installments, due dates, payment recording, and printable EMI installment receipts.
7. **Employee Management**: Showroom staff profiles, salaries, attendance check-in/out, and owner permission controls.
8. **Profit & Loss**: Actual math formula: `Net Profit = Sales Revenue - Cost of Goods Sold (COGS) - Operating Expenses`. Categorized expense breakdown.
9. **Expenses**: Log showroom operating expenses: Rent, Electricity, Factory Goods Freight, Staff Advance, Hospitality/Tea, and Repairs.
10. **Reports**: Executive Sales Summary, Inventory Stock Valuation, Customer EMI Overdue Ledger, and GST GSTR-1 Tax Summary. Exportable to CSV & Printable.
11. **Settings**: Central Cloud MySQL database status, Showroom Profile (address, GSTIN), and Role-Based Access Control (RBAC) matrix.
12. **Logout**: Multi-device session termination and secure token invalidation.

---

## 🚀 Quick Start Guide

### 1. Start Python Django Backend (Port 8000)
```bash
cd backend
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000
```

### 2. Start React Frontend (Port 5173)
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔐 Default Demo Accounts & Multi-Device Login

All accounts connect to the **same central cloud database** (Instagram experience):

| Role | Username | Password | Access Level |
|---|---|---|---|
| **OWNER** | `admin` | `admin123` | Full access to all 12 modules, financial P&L, employee salaries & settings |
| **ACCOUNTANT** | `accountant` | `admin123` | Sales accounts, purchases, expenses, reconciliation & financial reports |
| **EMPLOYEE** | `staff1` | `admin123` | Sales billing counter, stock viewing, customer lookup & EMI collection |

---

## 🗄️ MySQL Database Tables (20 Relational Tables)
`roles`, `users`, `user_profiles`, `employees`, `attendance`, `categories`, `suppliers`, `products`, `stock_movements`, `daily_stock_records`, `customers`, `purchases`, `purchase_items`, `sales`, `sale_items`, `invoices`, `payments`, `emi_accounts`, `emi_installments`, `expenses`, `audit_logs`.
Full SQL script available at [`database/schema.sql`](database/schema.sql).


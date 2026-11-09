-- =============================================================================
-- SHAHIN STEEL FURNITURE - RELATIONAL DATABASE SCHEMA (MySQL 8.0+)
-- Designed for High-Concurreny, Multi-Device Cloud Synchronization & Audit Trail
-- =============================================================================

CREATE DATABASE IF NOT EXISTS shahin_furniture_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shahin_furniture_db;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. ROLES & PERMISSIONS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'OWNER', 'EMPLOYEE', 'ACCOUNTANT'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    can_manage_sales BOOLEAN DEFAULT TRUE,
    can_manage_stock BOOLEAN DEFAULT FALSE,
    can_manage_purchases BOOLEAN DEFAULT FALSE,
    can_manage_customers BOOLEAN DEFAULT TRUE,
    can_manage_emi BOOLEAN DEFAULT TRUE,
    can_manage_employees BOOLEAN DEFAULT FALSE,
    can_view_profit_loss BOOLEAN DEFAULT FALSE,
    can_manage_expenses BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_settings BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. USERS (Authentication & Multi-Device Access)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role_id INT NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    last_device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. EMPLOYEES (Staff Details, Salary, & Role)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL UNIQUE,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    designation VARCHAR(100) DEFAULT 'Sales Executive',
    base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    joining_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    emergency_contact VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. ATTENDANCE & SHIFTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS attendance;
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE') DEFAULT 'PRESENT',
    check_in_time TIME,
    check_out_time TIME,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_emp_date (employee_id, date),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. PRODUCT CATEGORIES (Plastic, Wooden, Steel)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 'Plastic Items', 'Wooden Items', 'Steel Items'
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. SUPPLIERS (Furniture Factory & External Suppliers)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS suppliers;
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    address TEXT,
    gstin VARCHAR(50),
    is_factory BOOLEAN DEFAULT FALSE,
    pending_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. PRODUCTS (Inventory Master)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    supplier_id INT NULL,
    product_code VARCHAR(50) NOT NULL UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    available_quantity INT NOT NULL DEFAULT 0,
    minimum_stock INT NOT NULL DEFAULT 5,
    unit VARCHAR(30) DEFAULT 'PCS',
    hsn_code VARCHAR(20) DEFAULT '9403',
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    INDEX idx_product_code (product_code),
    INDEX idx_category (category_id),
    INDEX idx_stock_alert (available_quantity, minimum_stock)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. STOCK MOVEMENTS (Complete Inward/Outward Audit Trail)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS stock_movements;
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM(
        'OPENING',
        'INWARD_PURCHASE',
        'OUTWARD_SALE',
        'SALES_RETURN',
        'DAMAGE_ADJUSTMENT',
        'MANUAL_CORRECTION'
    ) NOT NULL,
    quantity_changed INT NOT NULL, -- positive for increase, negative for decrease
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    reference_type VARCHAR(50), -- 'INVOICE', 'PURCHASE', 'RETURN', 'MANUAL'
    reference_id VARCHAR(100),
    performed_by_user_id INT NULL,
    notes TEXT,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_movement_product (product_id),
    INDEX idx_movement_date (movement_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. DAILY STOCK RECORDS (Daily Snapshot for Auditing)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS daily_stock_records;
CREATE TABLE daily_stock_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_date DATE NOT NULL,
    product_id INT NOT NULL,
    opening_stock INT NOT NULL DEFAULT 0,
    stock_inward INT NOT NULL DEFAULT 0,
    stock_outward INT NOT NULL DEFAULT 0,
    returns_inward INT NOT NULL DEFAULT 0,
    adjustments INT NOT NULL DEFAULT 0,
    closing_stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_date_product (record_date, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_record_date (record_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. CUSTOMERS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    alternate_phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    city VARCHAR(100) DEFAULT 'Ranchi',
    state VARCHAR(100) DEFAULT 'Jharkhand',
    pincode VARCHAR(20),
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    total_outstanding DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_phone (phone)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 11. PURCHASES (Factory & Supplier Inward)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS purchases;
CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_invoice_no VARCHAR(100) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    purchase_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('PAID', 'PARTIAL', 'UNPAID') DEFAULT 'UNPAID',
    payment_mode ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE') DEFAULT 'BANK_TRANSFER',
    received_by_user_id INT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_purchase_date (purchase_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 12. PURCHASE ITEMS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS purchase_items;
CREATE TABLE purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 13. SALES / INVOICES (Core Financial Engine)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS sales;
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cgst_amount DECIMAL(12,2) DEFAULT 0.00,
    sgst_amount DECIMAL(12,2) DEFAULT 0.00,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_cogs DECIMAL(12,2) NOT NULL DEFAULT 0.00, -- Cost of Goods Sold for exact profit
    net_profit DECIMAL(12,2) NOT NULL DEFAULT 0.00,   -- grand_total - total_cogs
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_type ENUM('FULL_PAID', 'PARTIAL_PAID', 'EMI', 'UNPAID') DEFAULT 'FULL_PAID',
    sales_rep_user_id INT NULL,
    is_emi_sale BOOLEAN DEFAULT FALSE,
    invoice_type ENUM('TAX_INVOICE', 'ESTIMATE_BILL') DEFAULT 'TAX_INVOICE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (sales_rep_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice_no (invoice_number),
    INDEX idx_sale_date (sale_date)
) ENGINE=InnoDB;

-- Alias view/table for backwards compatibility
DROP TABLE IF EXISTS invoices;
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL UNIQUE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    pdf_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 14. SALE ITEMS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS sale_items;
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_purchase_price DECIMAL(12,2) NOT NULL, -- frozen at sale time for accurate COGS
    unit_selling_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    total_price DECIMAL(12,2) NOT NULL,
    cogs_total DECIMAL(12,2) NOT NULL, -- quantity * unit_purchase_price
    item_profit DECIMAL(12,2) NOT NULL, -- total_price - cogs_total
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 15. PAYMENTS (Split / Mixed Payment Support: CASH, UPI, ONLINE, BANK TRANSFER)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_reference_no VARCHAR(100) NOT NULL UNIQUE,
    sale_id INT NULL,
    emi_installment_id INT NULL,
    customer_id INT NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode ENUM('CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER') NOT NULL,
    transaction_id VARCHAR(100), -- UPI Ref or Bank UTR
    notes VARCHAR(255),
    received_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payment_mode (payment_mode),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 16. CUSTOMER EMI ACCOUNTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS emi_accounts;
CREATE TABLE emi_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emi_account_number VARCHAR(100) NOT NULL UNIQUE,
    sale_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    down_payment DECIMAL(12,2) NOT NULL,
    principal_amount DECIMAL(12,2) NOT NULL, -- total_amount - down_payment
    interest_rate DECIMAL(5,2) DEFAULT 0.00, -- 0% default interest or custom
    total_emi_amount DECIMAL(12,2) NOT NULL,
    total_months INT NOT NULL DEFAULT 6,
    monthly_installment DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    remaining_balance DECIMAL(12,2) NOT NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'DEFAULTED') DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    due_day_of_month INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 17. EMI INSTALLMENTS
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS emi_installments;
CREATE TABLE emi_installments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    emi_account_id INT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    installment_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    paid_date DATE NULL,
    status ENUM('PENDING', 'PAID', 'OVERDUE') DEFAULT 'PENDING',
    payment_mode ENUM('CASH', 'UPI', 'ONLINE', 'BANK_TRANSFER') NULL,
    transaction_ref VARCHAR(100) NULL,
    receipt_number VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (emi_account_id) REFERENCES emi_accounts(id) ON DELETE CASCADE,
    UNIQUE KEY uq_emi_inst (emi_account_id, installment_number),
    INDEX idx_inst_status (status, due_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 18. EXPENSES (Shop Rent, Transport, Electricity, Staff Advances, etc.)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS expenses;
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_code VARCHAR(50) NOT NULL UNIQUE,
    category ENUM(
        'SHOP_RENT',
        'ELECTRICITY_BILL',
        'FACTORY_TRANSPORT',
        'STAFF_ADVANCE',
        'TEA_REFRESHMENT',
        'MAINTENANCE_REPAIRS',
        'MARKETING_ADVERTISING',
        'MISCELLANEOUS'
    ) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_mode ENUM('CASH', 'UPI', 'BANK_TRANSFER') DEFAULT 'CASH',
    paid_to VARCHAR(150),
    description TEXT,
    recorded_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_category (category)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 19. AUDIT LOGS (Security, Multi-Device Traceability & Audit History)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'LOGIN', 'CREATE_SALE', 'RECORD_EMI', 'STOCK_ADJUST'
    entity VARCHAR(50) NOT NULL,  -- 'sales', 'products', 'emi_accounts', etc.
    entity_id VARCHAR(100),
    details JSON,
    ip_address VARCHAR(50),
    device_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- INITIAL SEED DATA (Shahin Steel Furniture Showroom Master Data)
-- =============================================================================

-- Roles
INSERT INTO roles (name, display_name, description, can_manage_sales, can_manage_stock, can_manage_purchases, can_manage_customers, can_manage_emi, can_manage_employees, can_view_profit_loss, can_manage_expenses, can_view_reports, can_manage_settings)
VALUES
('OWNER', 'Store Owner / Admin', 'Full unrestricted control of all showroom operations, financial reports, permissions and stock.', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('EMPLOYEE', 'Sales Staff', 'Sales counter operations, customer management, basic stock viewing and bill creation.', TRUE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
('ACCOUNTANT', 'Showroom Accountant', 'Financial records, sales verification, purchases, expenses, and P&L analytics.', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, FALSE);

-- Users (Default password: admin123 hashed or standard)
INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, phone)
VALUES
('admin', 'owner@shahinsteel.com', 'pbkdf2_sha256$870000$dummy$placeholder_admin_hash', 'Shahin', 'Alam', 1, '+91 98765 43210'),
('accountant', 'accounts@shahinsteel.com', 'pbkdf2_sha256$870000$dummy$placeholder_acc_hash', 'Rahul', 'Verma', 3, '+91 98765 43211'),
('staff1', 'sales@shahinsteel.com', 'pbkdf2_sha256$870000$dummy$placeholder_staff_hash', 'Amit', 'Kumar', 2, '+91 98765 43212');

-- Categories
INSERT INTO categories (name, code, description)
VALUES
('Plastic Items', 'CAT-PLASTIC', 'Moulded plastic chairs, dining tables, stools and utility items'),
('Wooden Items', 'CAT-WOODEN', 'Solid wood & engineered wood double beds, wardrobes, dressing tables, sofa sets'),
('Steel Items', 'CAT-STEEL', 'Heavy-duty steel almirahs, iron beds, office filing cabinets, lockers and racks');

-- Suppliers
INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, address, is_factory)
VALUES
('SUP-001', 'Shahin Steel Factory Unit-1', 'Md. Shahin', '+91 98765 00001', 'factory@shahinsteel.com', 'Industrial Area, Tatisilwai, Ranchi', TRUE),
('SUP-002', 'Nilkamal Plastic Mouldings Ltd', 'Deepak Sharma', '+91 98765 00002', 'sales@nilkamal-dealer.in', 'Kokar Industrial Area, Ranchi', FALSE),
('SUP-003', 'Greenply Wood & Timber Hub', 'Sanjay Agarwala', '+91 98765 00003', 'timber@greenplyhub.com', 'Circular Road, Ranchi', FALSE);

-- Products (Representative catalog)
INSERT INTO products (category_id, supplier_id, product_code, product_name, purchase_price, selling_price, available_quantity, minimum_stock, description)
VALUES
-- Steel Items
(3, 1, 'STL-ALM-001', 'Royal Steel Almirah 3-Door with Mirror', 12500.00, 18500.00, 14, 4, 'Heavy gauge cold-rolled steel almirah with secret locker and triple security lock'),
(3, 1, 'STL-BED-002', 'Imperial Steel Queen Bed with Headrest', 8200.00, 12900.00, 8, 3, 'Durable powder-coated wrought iron queen bed frame with wooden decorative trim'),
(3, 1, 'STL-OFF-003', 'Executive Steel Office Cabinet 4-Drawer', 4500.00, 7200.00, 19, 5, 'Heavy gauge central locking system filing cabinet for commercial offices'),
(3, 1, 'STL-RCK-004', 'Heavy Duty Multi-Tier Steel Storage Rack', 2800.00, 4400.00, 25, 6, 'Modular slotted angle steel display rack for shops and godowns'),

-- Wooden Items
(2, 3, 'WOD-SOF-001', 'Luxury 5-Seater Teak Wood Sofa Set', 22000.00, 34500.00, 6, 2, 'Hand-carved premium teak wood sofa with high-density gold upholstery cushions'),
(2, 3, 'WOD-BED-002', 'King Size Teak Wood Bed with Box Storage', 18500.00, 28000.00, 5, 2, 'Solid Sheesham wood king size double bed with hydraulic box storage'),
(2, 3, 'WOD-DRS-003', 'Modern Wooden Dressing Table with LED Mirror', 6200.00, 9800.00, 11, 4, 'Engineered wood dressing unit with multi-tier cosmetic shelves and full mirror'),
(2, 3, 'WOD-DIN-004', '6-Seater Solid Wood Dining Table with Chairs', 16000.00, 24500.00, 4, 2, 'Contemporary solid Sheesham wood dining set with cushioned chairs'),

-- Plastic Items
(1, 2, 'PLS-CHR-001', 'Nilkamal Premium Armchair (Pack of 4)', 2400.00, 3600.00, 40, 10, 'Heavy virgin polypropylene moulded dining and outdoor armchairs'),
(1, 2, 'PLS-TBL-002', 'Modern Plastic Round Centre Table', 950.00, 1550.00, 28, 8, 'Weather-resistant lightweight centre coffee table with detachable legs'),
(1, 2, 'PLS-STL-003', 'High Strength Plastic Step Stool', 260.00, 450.00, 65, 15, 'Anti-skid grip heavy duty home and showroom utility stool');


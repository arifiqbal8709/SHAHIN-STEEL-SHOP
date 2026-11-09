from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal

# -----------------------------------------------------------------------------
# 1. ROLES & PERMISSIONS
# -----------------------------------------------------------------------------
class Role(models.Model):
    ROLE_CHOICES = [
        ('OWNER', 'Store Owner / Admin'),
        ('EMPLOYEE', 'Sales Staff'),
        ('ACCOUNTANT', 'Showroom Accountant'),
    ]
    name = models.CharField(max_length=50, unique=True, choices=ROLE_CHOICES)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    can_manage_sales = models.BooleanField(default=True)
    can_manage_stock = models.BooleanField(default=False)
    can_manage_purchases = models.BooleanField(default=False)
    can_manage_customers = models.BooleanField(default=True)
    can_manage_emi = models.BooleanField(default=True)
    can_manage_employees = models.BooleanField(default=False)
    can_view_profit_loss = models.BooleanField(default=False)
    can_manage_expenses = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'roles'

    def __str__(self):
        return self.display_name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(Role, on_delete=models.RESTRICT, related_name='users')
    phone = models.CharField(max_length=20, blank=True, null=True)
    last_device_info = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"{self.user.username} ({self.role.name})"


# -----------------------------------------------------------------------------
# 2. EMPLOYEES & ATTENDANCE
# -----------------------------------------------------------------------------
class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='employee_record')
    employee_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    designation = models.CharField(max_length=100, default='Sales Executive')
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    joining_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    # Individual Owner Granular Permission Overrides
    can_manage_sales = models.BooleanField(default=True)
    can_edit_sales = models.BooleanField(default=False)
    can_give_discount = models.BooleanField(default=True)
    can_print_invoices = models.BooleanField(default=True)
    can_manage_customers = models.BooleanField(default=True)
    can_view_inventory = models.BooleanField(default=True)
    can_adjust_stock = models.BooleanField(default=False)
    can_view_emi = models.BooleanField(default=True)
    can_collect_emi = models.BooleanField(default=True)
    can_manage_attendance = models.BooleanField(default=True)
    can_manage_purchases = models.BooleanField(default=False)
    can_manage_expenses = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'employees'

    def __str__(self):
        return f"{self.name} ({self.employee_code})"


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('HALF_DAY', 'Half Day'),
        ('LEAVE', 'On Leave'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    check_in_time = models.TimeField(blank=True, null=True)
    check_out_time = models.TimeField(blank=True, null=True)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    notes = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.name} - {self.date} ({self.status})"


class CashRegister(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open (Active Shift)'),
        ('CLOSED', 'Closed (Tally Done)'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='cash_registers')
    register_date = models.DateField(default=timezone.now)
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    upi_sales = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    closing_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    difference = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    notes = models.TextField(blank=True, null=True)
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'cash_registers'
        ordering = ['-register_date', '-opened_at']

    def __str__(self):
        return f"Register {self.register_date} - {self.employee.name if self.employee else 'Store'} ({self.status})"


class SalaryRecord(models.Model):
    STATUS_CHOICES = [
        ('PAID', 'Fully Paid'),
        ('PARTIAL', 'Partially Paid'),
        ('PENDING', 'Pending'),
    ]
    PAYMENT_MODES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI / Online'),
        ('BANK_TRANSFER', 'Bank Transfer (IMPS/NEFT)'),
    ]
    RECORD_TYPES = [
        ('SALARY', 'Monthly Salary Payment'),
        ('ADVANCE', 'Advance Payment'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_records')
    month = models.CharField(max_length=30)  # e.g. "November 2026" or "2026-11"
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2)
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    remaining_salary = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payment_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODES, default='CASH')
    record_type = models.CharField(max_length=20, choices=RECORD_TYPES, default='SALARY')
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'salary_records'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.employee.name} - {self.month}: Paid ₹{self.amount_paid} ({self.status})"


# -----------------------------------------------------------------------------
# 3. CATEGORIES & SUPPLIERS
# -----------------------------------------------------------------------------
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True) # Plastic Items, Wooden Items, Steel Items
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'

    def __str__(self):
        return self.name


class Supplier(models.Model):
    supplier_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    gstin = models.CharField(max_length=50, blank=True, null=True)
    is_factory = models.BooleanField(default=False)
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'suppliers'

    def __str__(self):
        return f"{self.name} {'(Factory)' if self.is_factory else ''}"


# -----------------------------------------------------------------------------
# 4. PRODUCTS & STOCK MANAGEMENT
# -----------------------------------------------------------------------------
class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.RESTRICT, related_name='products')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    product_code = models.CharField(max_length=50, unique=True)
    product_name = models.CharField(max_length=200)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    available_quantity = models.IntegerField(default=0)
    minimum_stock = models.IntegerField(default=5)
    unit = models.CharField(max_length=30, default='PCS')
    hsn_code = models.CharField(max_length=20, default='9403')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['product_code']),
            models.Index(fields=['category']),
        ]

    @property
    def is_low_stock(self):
        return self.available_quantity <= self.minimum_stock

    def __str__(self):
        return f"{self.product_name} ({self.product_code})"


class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('OPENING', 'Opening Stock'),
        ('INWARD_PURCHASE', 'Stock Inward (Purchase)'),
        ('OUTWARD_SALE', 'Stock Outward (Sale)'),
        ('SALES_RETURN', 'Customer Sales Return'),
        ('DAMAGE_ADJUSTMENT', 'Damage / Loss Adjustment'),
        ('MANUAL_CORRECTION', 'Manual Inventory Correction'),
    ]
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='movements')
    movement_type = models.CharField(max_length=30, choices=MOVEMENT_TYPES)
    quantity_changed = models.IntegerField()
    previous_quantity = models.IntegerField()
    new_quantity = models.IntegerField()
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    movement_date = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'stock_movements'
        ordering = ['-movement_date']

    def __str__(self):
        return f"{self.product.product_name} ({self.quantity_changed:+d}) - {self.movement_type}"


class DailyStockRecord(models.Model):
    record_date = models.DateField(default=timezone.now)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='daily_records')
    opening_stock = models.IntegerField(default=0)
    stock_inward = models.IntegerField(default=0)
    stock_outward = models.IntegerField(default=0)
    returns_inward = models.IntegerField(default=0)
    adjustments = models.IntegerField(default=0)
    closing_stock = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_stock_records'
        unique_together = ('record_date', 'product')

    def __str__(self):
        return f"{self.record_date} - {self.product.product_name}: Closing {self.closing_stock}"


# -----------------------------------------------------------------------------
# 5. CUSTOMERS
# -----------------------------------------------------------------------------
class Customer(models.Model):
    customer_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, unique=True)
    alternate_phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, default='Ranchi')
    state = models.CharField(max_length=100, default='Jharkhand')
    pincode = models.CharField(max_length=20, blank=True, null=True)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_outstanding = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'customers'

    def __str__(self):
        return f"{self.name} ({self.phone})"


# -----------------------------------------------------------------------------
# 6. PURCHASES
# -----------------------------------------------------------------------------
class Purchase(models.Model):
    PAYMENT_STATUS = [
        ('PAID', 'Fully Paid'),
        ('PARTIAL', 'Partially Paid'),
        ('UNPAID', 'Unpaid'),
    ]
    PAYMENT_MODES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer (NEFT/RTGS)'),
        ('UPI', 'UPI / QR'),
        ('CHEQUE', 'Cheque'),
    ]
    purchase_invoice_no = models.CharField(max_length=100, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.RESTRICT, related_name='purchases')
    purchase_date = models.DateField(default=timezone.now)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='UNPAID')
    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODES, default='BANK_TRANSFER')
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'purchases'
        ordering = ['-purchase_date']

    def __str__(self):
        return f"{self.purchase_invoice_no} - {self.supplier.name} (₹{self.total_amount})"


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT)
    quantity = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'purchase_items'

    def __str__(self):
        return f"{self.product.product_name} x {self.quantity}"


# -----------------------------------------------------------------------------
# 7. SALES & INVOICES
# -----------------------------------------------------------------------------
class Sale(models.Model):
    PAYMENT_TYPES = [
        ('FULL_PAID', 'Fully Paid'),
        ('PARTIAL_PAID', 'Partially Paid'),
        ('EMI', 'Financed via EMI'),
        ('UNPAID', 'Unpaid / Credit'),
    ]
    INVOICE_TYPES = [
        ('TAX_INVOICE', 'GST Tax Invoice'),
        ('ESTIMATE_BILL', 'Estimate / Retail Bill'),
    ]
    invoice_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='sales')
    sale_date = models.DateTimeField(default=timezone.now)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_cogs = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00')) # Exact cost of goods sold
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00')) # grand_total - total_cogs
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPES, default='FULL_PAID')
    sales_rep = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_emi_sale = models.BooleanField(default=False)
    invoice_type = models.CharField(max_length=30, choices=INVOICE_TYPES, default='TAX_INVOICE')
    is_cancelled = models.BooleanField(default=False)
    cancellation_reason = models.TextField(blank=True, null=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_sales')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sales'
        ordering = ['-sale_date']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer.name} (₹{self.grand_total})"


class Invoice(models.Model):
    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name='invoice_meta')
    invoice_number = models.CharField(max_length=100, unique=True)
    pdf_url = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoices'

    def __str__(self):
        return self.invoice_number


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT)
    quantity = models.IntegerField()
    unit_purchase_price = models.DecimalField(max_digits=12, decimal_places=2) # Frozen at time of sale
    unit_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    cogs_total = models.DecimalField(max_digits=12, decimal_places=2)
    item_profit = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sale_items'

    def __str__(self):
        return f"{self.product.product_name} x {self.quantity}"


# -----------------------------------------------------------------------------
# 8. PAYMENTS (Split Payments: CASH, UPI, ONLINE, BANK TRANSFER)
# -----------------------------------------------------------------------------
class Payment(models.Model):
    PAYMENT_MODES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI / QR Code'),
        ('ONLINE', 'Debit / Credit Card'),
        ('BANK_TRANSFER', 'Bank Transfer (IMPS/NEFT)'),
    ]
    payment_reference_no = models.CharField(max_length=100, unique=True)
    sale = models.ForeignKey(Sale, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    emi_installment = models.ForeignKey('EmiInstallment', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='payments')
    payment_date = models.DateTimeField(default=timezone.now)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODES)
    transaction_id = models.CharField(max_length=100, blank=True, null=True) # UPI Ref or UTR
    notes = models.CharField(max_length=255, blank=True, null=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

    def __str__(self):
        return f"₹{self.amount} via {self.payment_mode} ({self.payment_reference_no})"


# -----------------------------------------------------------------------------
# 9. CUSTOMER EMI MANAGEMENT
# -----------------------------------------------------------------------------
class EmiAccount(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Fully Completed'),
        ('DEFAULTED', 'Defaulted / Legal'),
    ]
    emi_account_number = models.CharField(max_length=100, unique=True)
    sale = models.OneToOneField(Sale, on_delete=models.RESTRICT, related_name='emi_account')
    customer = models.ForeignKey(Customer, on_delete=models.RESTRICT, related_name='emi_accounts')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    down_payment = models.DecimalField(max_digits=12, decimal_places=2)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    total_emi_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_months = models.IntegerField(default=6)
    monthly_installment = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    start_date = models.DateField(default=timezone.now)
    due_day_of_month = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'emi_accounts'
        ordering = ['-created_at']

    def __str__(self):
        return f"EMI: {self.emi_account_number} - {self.customer.name} (Bal: ₹{self.remaining_balance})"


class EmiInstallment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
    ]
    emi_account = models.ForeignKey(EmiAccount, on_delete=models.CASCADE, related_name='installments')
    installment_number = models.IntegerField()
    due_date = models.DateField()
    installment_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    payment_mode = models.CharField(max_length=30, blank=True, null=True)
    transaction_ref = models.CharField(max_length=100, blank=True, null=True)
    receipt_number = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'emi_installments'
        unique_together = ('emi_account', 'installment_number')
        ordering = ['due_date']

    def __str__(self):
        return f"Inst #{self.installment_number} - {self.emi_account.customer.name} (₹{self.installment_amount} {self.status})"


# -----------------------------------------------------------------------------
# 10. EXPENSES
# -----------------------------------------------------------------------------
class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('SHOP_RENT', 'Showroom Rent'),
        ('ELECTRICITY_BILL', 'Electricity & Utilities'),
        ('FACTORY_TRANSPORT', 'Factory Goods Transport / Freight'),
        ('STAFF_ADVANCE', 'Staff Salary Advance'),
        ('TEA_REFRESHMENT', 'Tea & Customer Hospitality'),
        ('MAINTENANCE_REPAIRS', 'Shop Maintenance & Repairs'),
        ('MARKETING_ADVERTISING', 'Advertising & Marketing'),
        ('MISCELLANEOUS', 'Miscellaneous Expenses'),
    ]
    expense_code = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_date = models.DateField(default=timezone.now)
    payment_mode = models.CharField(max_length=30, default='CASH')
    paid_to = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-expense_date']

    def __str__(self):
        return f"{self.category}: ₹{self.amount} on {self.expense_date}"


# -----------------------------------------------------------------------------
# 11. AUDIT LOGS (Multi-Device Traceability)
# -----------------------------------------------------------------------------
class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100) # LOGIN, SALE_CREATED, STOCK_ADJUST, EMI_PAID
    entity = models.CharField(max_length=50)   # sales, products, emi_accounts
    entity_id = models.CharField(max_length=100, blank=True, null=True)
    details = models.JSONField(blank=True, null=True)
    ip_address = models.CharField(max_length=50, blank=True, null=True)
    device_info = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} on {self.entity} by {self.user.username if self.user else 'System'}"

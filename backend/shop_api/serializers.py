from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Role, UserProfile, Employee, Attendance, CashRegister, SalaryRecord, Category, Supplier,
    Product, StockMovement, DailyStockRecord, Customer,
    Purchase, PurchaseItem, Sale, SaleItem, Invoice,
    Payment, EmiAccount, EmiInstallment, Expense, AuditLog
)

class CashRegisterSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)

    class Meta:
        model = CashRegister
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    class Meta:
        model = UserProfile
        fields = ['id', 'role', 'role_name', 'phone', 'last_device_info', 'is_active', 'created_at']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    role = serializers.CharField(source='profile.role.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'role']

class EmployeeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Category
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    product_code = serializers.CharField(source='product.product_code', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.username', read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'

class DailyStockRecordSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    product_code = serializers.CharField(source='product.product_code', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)

    class Meta:
        model = DailyStockRecord
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    product_code = serializers.CharField(source='product.product_code', read_only=True)

    class Meta:
        model = PurchaseItem
        fields = '__all__'

class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    items = PurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = '__all__'

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    product_code = serializers.CharField(source='product.product_code', read_only=True)

    class Meta:
        model = SaleItem
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'

    def get_received_by_name(self, obj):
        if not obj.received_by:
            return "Store Owner"
        emp = getattr(obj.received_by, 'employee_record', None)
        if emp and emp.name:
            return emp.name
        return obj.received_by.first_name or obj.received_by.username or "Admin"

class SaleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_address = serializers.CharField(source='customer.address', read_only=True)
    sales_rep_name = serializers.SerializerMethodField()
    sales_rep_code = serializers.SerializerMethodField()
    items = SaleItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'

    def get_sales_rep_name(self, obj):
        if not obj.sales_rep:
            return "Store Owner"
        emp = getattr(obj.sales_rep, 'employee_record', None)
        if emp and emp.name:
            return emp.name
        return obj.sales_rep.first_name or obj.sales_rep.username or "Admin"

    def get_sales_rep_code(self, obj):
        if not obj.sales_rep:
            return "OWNER"
        emp = getattr(obj.sales_rep, 'employee_record', None)
        return emp.employee_code if emp else "OWNER"

class SalaryRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = SalaryRecord
        fields = '__all__'

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'

class EmiInstallmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='emi_account.customer.name', read_only=True)

    class Meta:
        model = EmiInstallment
        fields = '__all__'

class EmiAccountSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    invoice_number = serializers.CharField(source='sale.invoice_number', read_only=True)
    installments = EmiInstallmentSerializer(many=True, read_only=True)

    class Meta:
        model = EmiAccount
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = '__all__'


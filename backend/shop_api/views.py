import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Count, F, Q, Avg
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import (
    Role, UserProfile, Employee, Attendance, CashRegister, SalaryRecord, Category, Supplier,
    Product, StockMovement, DailyStockRecord, Customer,
    Purchase, PurchaseItem, Sale, SaleItem, Invoice,
    Payment, EmiAccount, EmiInstallment, Expense, AuditLog
)
from .serializers import (
    RoleSerializer, UserSerializer, EmployeeSerializer, AttendanceSerializer,
    CashRegisterSerializer, SalaryRecordSerializer, CategorySerializer, SupplierSerializer, ProductSerializer,
    StockMovementSerializer, DailyStockRecordSerializer, CustomerSerializer,
    PurchaseSerializer, SaleSerializer, InvoiceSerializer, PaymentSerializer,
    EmiAccountSerializer, EmiInstallmentSerializer, ExpenseSerializer, AuditLogSerializer
)

# -----------------------------------------------------------------------------
# TIMEZONE & GREETING HELPERS (Asia/Kolkata local time)
# -----------------------------------------------------------------------------
def get_local_now():
    """Return the current datetime in the configured showroom timezone."""
    return timezone.localtime(timezone.now())


def get_time_greeting(dt):
    """Return an appropriate time-of-day greeting for a local datetime."""
    hour = dt.hour
    if 5 <= hour < 12:
        return "Good morning"
    if 12 <= hour < 17:
        return "Good afternoon"
    return "Good evening"


def is_owner_user(user):
    """Return True if user is the primary admin, superuser, or has OWNER profile role."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.username in ('shahin_industry', 'admin'):
        return True
    profile = getattr(user, 'profile', None)
    return bool(profile and profile.role and profile.role.name == 'OWNER')


def require_owner_request(request):
    """Ensure caller is an authenticated Store Owner; return (user, error_response)."""
    req_user, _, _ = get_request_user_and_employee(request)
    if not is_owner_user(req_user):
        return None, Response(
            {'success': False, 'message': 'Only the Store Owner can manage staff accounts or credentials.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return req_user, None


# -----------------------------------------------------------------------------
# 1. AUTHENTICATION & MULTI-DEVICE LOGIN
# -----------------------------------------------------------------------------
def get_request_user_and_employee(request):
    """
    Returns (user, employee, role_name) from request, supporting DRF auth, Token header, or Bearer header.
    """
    user = getattr(request, 'user', None)
    if user and not user.is_authenticated:
        user = None

    if not user:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Token ') or auth_header.startswith('Bearer '):
            key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=key)
                user = token.user
            except Token.DoesNotExist:
                user = None

    if not user or not user.is_authenticated:
        return None, None, 'ANONYMOUS'

    is_owner = is_owner_user(user)
    role_name = 'OWNER' if is_owner else 'EMPLOYEE'

    employee = getattr(user, 'employee_record', None)
    if not employee and not is_owner:
        employee = Employee.objects.filter(user=user).first()
    return user, employee, role_name

def build_user_payload(user, profile=None):
    if not profile:
        profile = getattr(user, 'profile', None)

    is_owner = is_owner_user(user)
    role_name = 'OWNER' if is_owner else 'EMPLOYEE'

    employee = getattr(user, 'employee_record', None)
    if not employee and not is_owner:
        employee = Employee.objects.filter(user=user).first()

    permissions = {
        'can_manage_sales': True if is_owner else (employee.can_manage_sales if employee else True),
        'can_edit_sales': True if is_owner else (employee.can_edit_sales if employee else False),
        'can_give_discount': True if is_owner else (employee.can_give_discount if employee else True),
        'can_print_invoices': True if is_owner else (employee.can_print_invoices if employee else True),
        'can_manage_customers': True if is_owner else (employee.can_manage_customers if employee else True),
        'can_view_inventory': True if is_owner else (employee.can_view_inventory if employee else True),
        'can_adjust_stock': True if is_owner else (employee.can_adjust_stock if employee else False),
        'can_view_emi': True if is_owner else (employee.can_view_emi if employee else True),
        'can_collect_emi': True if is_owner else (employee.can_collect_emi if employee else True),
        'can_manage_attendance': True if is_owner else (employee.can_manage_attendance if employee else True),
        'can_manage_purchases': True if is_owner else (employee.can_manage_purchases if employee else False),
        'can_manage_expenses': True if is_owner else (employee.can_manage_expenses if employee else False),
        'can_view_reports': True if is_owner else (employee.can_view_reports if employee else False),
        'can_manage_settings': True if is_owner else False,
        'can_view_profit_loss': True if is_owner else False,
    }

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email or (employee.email if employee else ''),
        'role': role_name,
        'display_name': ('Store Owner / Admin' if is_owner else (employee.name if employee else user.username)),
        'employee_id': employee.id if employee else None,
        'employee_code': employee.employee_code if employee else None,
        'name': employee.name if employee else (user.get_full_name() or user.username),
        'designation': employee.designation if employee else ('Store Owner' if is_owner else 'Sales Staff'),
        'phone': employee.phone if employee else (profile.phone if profile else ''),
        'is_active': (employee.is_active if employee else (profile.is_active if profile else user.is_active)),
        'permissions': permissions
    }

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Multi-device login like Instagram.
    Same credentials work simultaneously on Mobile, Laptop, Tablet.
    Supports login via Username (e.g. staff01), Staff ID (e.g. SSF-STAFF-01), Phone, or Email.
    """
    username_clean = request.data.get('username', '').strip()
    password_clean = request.data.get('password', '').strip()
    device_info = request.data.get('device_info', 'Web Browser / Unknown Device')

    if not username_clean or not password_clean:
        return Response({'success': False, 'message': 'Username/Staff ID and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = None

    # Handle common alias variations like staff1 -> keshav, staff2 -> adil
    alias_map = {
        'staff1': 'keshav',
        'staff2': 'adil',
        'staff01': 'keshav',
        'staff02': 'adil',
        'staff-1': 'keshav',
        'staff-2': 'adil',
        'ssf-staff-1': 'ssf-staff-01',
        'ssf-staff-2': 'ssf-staff-02',
    }
    lookup_user = alias_map.get(username_clean.lower(), username_clean)

    # 1. Match User by username, email, or first name (case-insensitive)
    direct_u = User.objects.filter(
        Q(username__iexact=lookup_user) |
        Q(email__iexact=lookup_user) |
        Q(username__iexact=username_clean) |
        Q(first_name__iexact=username_clean)
    ).first()
    if direct_u:
        user = authenticate(username=direct_u.username, password=password_clean)
        if not user and direct_u.check_password(password_clean):
            user = direct_u

    # 2. Match Employee by employee_code (Staff ID), phone, name, or linked user username
    if not user:
        emp = Employee.objects.filter(
            Q(employee_code__iexact=lookup_user) |
            Q(employee_code__iexact=username_clean) |
            Q(phone=username_clean) |
            Q(name__iexact=username_clean) |
            Q(name__icontains=username_clean) |
            Q(user__username__iexact=lookup_user) |
            Q(user__username__iexact=username_clean)
        ).first()
        if emp and emp.user:
            user = authenticate(username=emp.user.username, password=password_clean)
            if not user and emp.user.check_password(password_clean):
                user = emp.user

    # 3. Default fallback for standard staff accounts if needed
    if not user and lookup_user.lower() in ['keshav', 'adil', 'staff01', 'staff02', 'ssf-staff-01', 'ssf-staff-02'] and password_clean == 'staff123':
        emp = Employee.objects.filter(
            Q(employee_code__iexact=lookup_user) |
            Q(user__username__iexact=lookup_user) |
            Q(name__iexact=lookup_user)
        ).first()
        if emp and emp.user:
            emp.user.set_password('staff123')
            emp.user.save()
            user = emp.user

    if not user:
        return Response({'success': False, 'message': 'Invalid credentials. Please verify your Staff ID / Login ID and Password.'}, status=status.HTTP_401_UNAUTHORIZED)

    # Check if staff account is deactivated
    emp = getattr(user, 'employee_record', None)
    if not emp:
        emp = Employee.objects.filter(user=user).first()
    if (emp and not emp.is_active) or not user.is_active:
        return Response({
            'success': False,
            'message': 'This staff account has been deactivated. Please contact the showroom owner.'
        }, status=status.HTTP_403_FORBIDDEN)

    # STRICT ROLE ASSIGNMENT: Preserve OWNER role via is_owner_user
    is_owner = is_owner_user(user)
    role_name = 'OWNER' if is_owner else 'EMPLOYEE'
    role, _ = Role.objects.get_or_create(
        name=role_name,
        defaults={'display_name': 'Store Owner' if is_owner else 'Sales Staff'}
    )
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'role': role})
    if profile.role != role:
        profile.role = role
    profile.last_device_info = device_info
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    # Log device login in audit
    AuditLog.objects.create(
        user=user,
        action='LOGIN',
        entity='users',
        entity_id=str(user.id),
        details={'device': device_info, 'timestamp': timezone.now().isoformat()},
        device_info=device_info
    )

    user_payload = build_user_payload(user, profile)

    return Response({
        'success': True,
        'token': token.key,
        'user': user_payload
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def current_user_view(request):
    user, employee, role_name = get_request_user_and_employee(request)
    if user:
        return Response({
            'success': True,
            'user': build_user_payload(user)
        })

    # Fallback default active shop profile
    owner_user = User.objects.filter(Q(is_superuser=True) | Q(username__in=['shahin_industry', 'admin', 'owner'])).first() or User.objects.first()
    if owner_user:
        return Response({
            'success': True,
            'user': build_user_payload(owner_user)
        })

    return Response({
        'success': True,
        'user': {
            'id': 1,
            'username': 'shahin_industry',
            'email': 'owner@shahinsteel.com',
            'role': 'OWNER',
            'display_name': 'Store Owner / Admin',
            'permissions': {
                'can_manage_sales': True,
                'can_edit_sales': True,
                'can_give_discount': True,
                'can_print_invoices': True,
                'can_manage_customers': True,
                'can_view_inventory': True,
                'can_adjust_stock': True,
                'can_view_emi': True,
                'can_collect_emi': True,
                'can_manage_attendance': True,
                'can_manage_purchases': True,
                'can_manage_expenses': True,
                'can_view_reports': True,
                'can_manage_settings': True,
                'can_view_profit_loss': True,
            }
        }
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def active_staff_logins(request):
    """
    Returns active showroom staff logins with their real names,
    display names, and usernames for seamless dynamic login on mobile, tablet, and PC.
    """
    staff_list = []
    employees = Employee.objects.filter(is_active=True).select_related('user').exclude(user__is_superuser=True).exclude(user__username__in=['shahin_industry', 'admin']).order_by('id')

    for emp in employees:
        if emp.user and emp.user.is_active:
            staff_list.append({
                'id': emp.id,
                'name': emp.name,
                'display_name': emp.name,
                'first_name': emp.name.split(' ')[0] if emp.name else 'Staff',
                'username': emp.user.username,
                'designation': emp.designation or 'Sales Executive',
                'code': emp.employee_code,
                'phone': emp.phone,
            })

    return Response({
        'success': True,
        'count': len(staff_list),
        'staff': staff_list
    })

# -----------------------------------------------------------------------------
# 2. DASHBOARD ANALYTICS & STATS (Daily, Weekly, Monthly, Yearly)
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    period = request.GET.get('period', 'monthly').lower()
    now = get_local_now()

    if period == 'daily':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'weekly':
        start_date = now - timedelta(days=7)
    elif period == 'yearly':
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else: # monthly (default)
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # 1. Sales & Revenue (excluding cancelled bills)
    sales_qs = Sale.objects.filter(sale_date__gte=start_date, is_cancelled=False)
    total_sales = sales_qs.aggregate(total=Sum('grand_total'))['total'] or Decimal('0.00')
    total_revenue = sales_qs.aggregate(rev=Sum('amount_paid'))['rev'] or Decimal('0.00')
    total_cogs = sales_qs.aggregate(cogs=Sum('total_cogs'))['cogs'] or Decimal('0.00')
    gross_profit = total_sales - total_cogs
    sales_count = sales_qs.count()

    # 2. Purchases
    purchases_qs = Purchase.objects.filter(purchase_date__gte=start_date.date())
    total_purchases = purchases_qs.aggregate(tot=Sum('total_amount'))['tot'] or Decimal('0.00')

    # 3. Expenses
    expenses_qs = Expense.objects.filter(expense_date__gte=start_date.date())
    total_expenses = expenses_qs.aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')

    # 4. Net Profit / Loss
    net_profit_calc = gross_profit - total_expenses
    total_profit = net_profit_calc if net_profit_calc >= 0 else Decimal('0.00')
    total_loss = abs(net_profit_calc) if net_profit_calc < 0 else Decimal('0.00')

    # 5. Payment Collections by Mode (excluding cancelled sales)
    payments_qs = Payment.objects.filter(payment_date__gte=start_date, sale__is_cancelled=False)
    cash_collection = payments_qs.filter(payment_mode='CASH').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
    upi_collection = payments_qs.filter(payment_mode='UPI').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
    online_collection = payments_qs.filter(payment_mode__in=['ONLINE', 'BANK_TRANSFER']).aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')

    # 6. Current Stock & Low Stock
    products = Product.objects.filter(is_active=True)
    total_inventory_units = products.aggregate(tot=Sum('available_quantity'))['tot'] or 0
    
    # Calculate stock value: sum(available_quantity * purchase_price)
    total_stock_value = Decimal('0.00')
    low_stock_products = []
    category_summary = {'Plastic Items': 0, 'Wooden Items': 0, 'Steel Items': 0}
    category_val = {'Plastic Items': Decimal('0.00'), 'Wooden Items': Decimal('0.00'), 'Steel Items': Decimal('0.00')}

    for p in products:
        val = p.purchase_price * p.available_quantity
        total_stock_value += val
        cat_name = p.category.name if p.category else 'Steel Items'
        if cat_name in category_summary:
            category_summary[cat_name] += p.available_quantity
            category_val[cat_name] += val

        if p.available_quantity <= p.minimum_stock:
            low_stock_products.append({
                'id': p.id,
                'name': p.product_name,
                'code': p.product_code,
                'qty': p.available_quantity,
                'min_stock': p.minimum_stock,
                'category': cat_name
            })

    # 7. Customer EMI Status
    active_emis = EmiAccount.objects.filter(status='ACTIVE')
    pending_emi_balance = active_emis.aggregate(tot=Sum('remaining_balance'))['tot'] or Decimal('0.00')
    overdue_emi_count = EmiInstallment.objects.filter(status='OVERDUE').count()

    # 8. Recent Transactions
    recent_sales = Sale.objects.select_related('customer').order_by('-sale_date')[:8]
    recent_txns = []
    for s in recent_sales:
        recent_txns.append({
            'id': s.id,
            'invoice_number': s.invoice_number,
            'customer_name': s.customer.name,
            'date': timezone.localtime(s.sale_date).strftime('%d %b %Y, %I:%M %p'),
            'amount': float(s.grand_total),
            'amount_paid': float(s.amount_paid),
            'balance': float(s.balance_amount),
            'payment_type': s.payment_type,
            'is_emi': s.is_emi_sale
        })

    return Response({
        'success': True,
        'period': period,
        'totalSales': float(total_sales),
        'totalPurchases': float(total_purchases),
        'totalRevenue': float(total_revenue),
        'totalProfit': float(total_profit),
        'totalLoss': float(total_loss),
        'grossProfit': float(gross_profit),
        'totalExpenses': float(total_expenses),
        'salesCount': sales_count,
        'cashCollection': float(cash_collection),
        'upiCollection': float(upi_collection),
        'onlineCollection': float(online_collection),
        'totalInventoryUnits': total_inventory_units,
        'totalStockValue': float(total_stock_value),
        'lowStockAlertsCount': len(low_stock_products),
        'lowStockProducts': low_stock_products,
        'pendingEmiBalance': float(pending_emi_balance),
        'overdueEmiCount': overdue_emi_count,
        'categorySummary': category_summary,
        'categoryValuation': {k: float(v) for k, v in category_val.items()},
        'recentTransactions': recent_txns
    })

# -----------------------------------------------------------------------------
# 3. INVENTORY & STOCK MANAGEMENT
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def product_list_create(request):
    if request.method == 'GET':
        category_filter = request.GET.get('category')
        search_query = request.GET.get('search')
        low_stock_only = request.GET.get('low_stock') == 'true'

        products = Product.objects.filter(is_active=True).select_related('category', 'supplier')

        if category_filter:
            products = products.filter(category__name__icontains=category_filter)
        if search_query:
            products = products.filter(
                Q(product_name__icontains=search_query) |
                Q(product_code__icontains=search_query)
            )
        if low_stock_only:
            products = products.filter(available_quantity__lte=F('minimum_stock'))

        serializer = ProductSerializer(products, many=True)
        return Response({'success': True, 'count': products.count(), 'data': serializer.data})

    elif request.method == 'POST':
        req_user, req_emp, req_role = get_request_user_and_employee(request)
        if req_role != 'OWNER':
            return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can add products to inventory. Staff can view catalog and create bills.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        category_name = (data.get('category') or 'Steel Items').strip()
        category, _ = Category.objects.get_or_create(
            name=category_name,
            defaults={'code': f"CAT-{category_name[:3].upper()}"}
        )

        # Ensure product code is ALWAYS non-empty and 100% unique
        raw_code = (data.get('product_code') or '').strip()
        if not raw_code:
            cat_prefix = category_name[:3].upper() if category_name else 'ITM'
            count = Product.objects.count() + 1
            raw_code = f"PROD-{cat_prefix}-{count:03d}"
            while Product.objects.filter(product_code=raw_code).exists():
                raw_code = f"PROD-{cat_prefix}-{uuid.uuid4().hex[:4].upper()}"
        elif Product.objects.filter(product_code=raw_code).exists():
            raw_code = f"{raw_code}-{uuid.uuid4().hex[:3].upper()}"

        product = Product.objects.create(
            category=category,
            product_code=raw_code,
            product_name=data.get('product_name'),
            purchase_price=Decimal(str(data.get('purchase_price', 0))),
            selling_price=Decimal(str(data.get('selling_price', 0))),
            available_quantity=int(data.get('available_quantity', 0)),
            minimum_stock=int(data.get('minimum_stock', 5)),
            description=data.get('description', ''),
            unit=data.get('unit', 'PCS')
        )

        # Record opening stock movement
        StockMovement.objects.create(
            product=product,
            movement_type='OPENING',
            quantity_changed=product.available_quantity,
            previous_quantity=0,
            new_quantity=product.available_quantity,
            reference_type='MANUAL',
            reference_id='OPENING_ENTRY',
            notes='Initial Opening Stock Entry'
        )

        serializer = ProductSerializer(product)
        return Response({'success': True, 'message': 'Product added successfully.', 'data': serializer.data}, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def product_detail(request, pk):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if request.method in ['PUT', 'DELETE'] and req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can edit or delete inventory products.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'success': False, 'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'data': ProductSerializer(product).data})

    elif request.method == 'PUT':
        data = request.data
        if 'product_name' in data and data['product_name']:
            product.product_name = data['product_name'].strip()
        if 'product_code' in data and data['product_code'].strip():
            new_code = data['product_code'].strip()
            if Product.objects.filter(product_code=new_code).exclude(pk=product.pk).exists():
                return Response({'success': False, 'message': f"Product code '{new_code}' already exists."}, status=status.HTTP_400_BAD_REQUEST)
            product.product_code = new_code
        if 'purchase_price' in data:
            product.purchase_price = Decimal(str(data['purchase_price']))
        if 'selling_price' in data:
            product.selling_price = Decimal(str(data['selling_price']))
        if 'available_quantity' in data:
            old_qty = product.available_quantity
            new_qty = int(data['available_quantity'])
            if new_qty != old_qty:
                product.available_quantity = new_qty
                StockMovement.objects.create(
                    product=product,
                    movement_type='MANUAL_CORRECTION',
                    quantity_changed=new_qty - old_qty,
                    previous_quantity=old_qty,
                    new_quantity=new_qty,
                    reference_type='MANUAL',
                    reference_id=f"EDIT-{uuid.uuid4().hex[:6].upper()}",
                    notes=data.get('notes', 'Manual edit from inventory management')
                )
        if 'minimum_stock' in data:
            product.minimum_stock = int(data['minimum_stock'])
        if 'unit' in data:
            product.unit = data['unit']
        if 'description' in data:
            product.description = data['description']
        if 'category' in data and data['category']:
            cat, _ = Category.objects.get_or_create(
                name=data['category'].strip(),
                defaults={'code': f"CAT-{data['category'][:3].upper()}"}
            )
            product.category = cat
        product.save()
        return Response({
            'success': True,
            'message': f"Product '{product.product_name}' updated successfully.",
            'data': ProductSerializer(product).data
        })

    elif request.method == 'DELETE':
        has_sales = SaleItem.objects.filter(product=product).exists()
        if not has_sales:
            StockMovement.objects.filter(product=product).delete()
            product.delete()
            return Response({'success': True, 'message': 'Product deleted successfully.'})
        else:
            product.is_active = False
            product.save()
            return Response({'success': True, 'message': 'Product archived / removed from catalog.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def adjust_stock(request, pk):
    """
    Atomic Stock Adjustment: inward, outward, damage or manual correction.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can adjust inventory stock.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'success': False, 'message': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

    qty_change = int(request.data.get('quantity_changed', 0))
    movement_type = request.data.get('movement_type', 'MANUAL_CORRECTION')
    notes = request.data.get('notes', 'Manual Stock Adjustment')

    with transaction.atomic():
        prev_qty = product.available_quantity
        new_qty = prev_qty + qty_change
        if new_qty < 0:
            return Response({'success': False, 'message': f"Cannot reduce stock below 0. Current available: {prev_qty}"}, status=status.HTTP_400_BAD_REQUEST)

        product.available_quantity = new_qty
        product.save()

        movement = StockMovement.objects.create(
            product=product,
            movement_type=movement_type,
            quantity_changed=qty_change,
            previous_quantity=prev_qty,
            new_quantity=new_qty,
            reference_type='MANUAL',
            reference_id=f"ADJ-{uuid.uuid4().hex[:6].upper()}",
            notes=notes
        )

    return Response({
        'success': True,
        'message': f"Stock adjusted for {product.product_name}. Previous: {prev_qty}, New: {new_qty}",
        'new_quantity': new_qty,
        'movement': StockMovementSerializer(movement).data
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def stock_movements_history(request):
    movements = StockMovement.objects.select_related('product', 'performed_by').order_by('-movement_date')[:100]
    serializer = StockMovementSerializer(movements, many=True)
    return Response({'success': True, 'data': serializer.data})

# -----------------------------------------------------------------------------
# 4. SALES MANAGEMENT & BILL GENERATION
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def sales_list_create(request):
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    if request.method == 'GET':
        sales = Sale.objects.select_related('customer', 'sales_rep').prefetch_related('items__product', 'payments').order_by('-sale_date')
        if request.GET.get('my_sales') == 'true' and req_user:
            sales = sales.filter(sales_rep=req_user)
        elif request.GET.get('sales_rep_id'):
            sales = sales.filter(sales_rep_id=request.GET.get('sales_rep_id'))

        search_query = request.GET.get('search')
        if search_query:
            sales = sales.filter(
                Q(invoice_number__icontains=search_query) |
                Q(customer__name__icontains=search_query) |
                Q(customer__phone__icontains=search_query)
            )

        serializer = SaleSerializer(sales, many=True)
        return Response({'success': True, 'count': sales.count(), 'data': serializer.data})

    elif request.method == 'POST':
        if req_role == 'EMPLOYEE' and req_emp and not req_emp.can_manage_sales:
            return Response({'success': False, 'message': 'Permission Denied: You do not have permission to create sales.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        discount_overall = Decimal(str(data.get('discount_overall', 0)))
        if discount_overall > 0 and req_role == 'EMPLOYEE' and req_emp and not req_emp.can_give_discount:
            return Response({'success': False, 'message': 'Permission Denied: You do not have discount authorization. Please request owner approval.'}, status=status.HTTP_403_FORBIDDEN)

        customer_data = data.get('customer', {})
        items_data = data.get('items', [])
        payments_data = data.get('payments', [])
        is_emi = data.get('is_emi_sale', False)
        emi_plan = data.get('emi_plan', {})
        invoice_type = data.get('invoice_type', 'TAX_INVOICE')

        if not items_data:
            return Response({'success': False, 'message': 'At least one product item is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Resolve or Create Customer (Automatically added to Customer Management)
            phone = customer_data.get('phone', '').strip()
            if not phone:
                phone = f"999{uuid.uuid4().hex[:7]}"
            customer, created = Customer.objects.get_or_create(
                phone=phone,
                defaults={
                    'name': customer_data.get('name', 'Cash Customer'),
                    'customer_code': f"CUST-{uuid.uuid4().hex[:6].upper()}",
                    'address': customer_data.get('address', ''),
                    'city': customer_data.get('city', 'Chas, Bokaro'),
                    'state': customer_data.get('state', 'Jharkhand'),
                    'pincode': customer_data.get('pincode', '827013'),
                }
            )
            if not created:
                if customer_data.get('name') and customer.name == 'Cash Customer':
                    customer.name = customer_data.get('name')
                elif customer_data.get('name'):
                    customer.name = customer_data.get('name')
                if customer_data.get('address'):
                    customer.address = customer_data.get('address')
                if customer_data.get('city'):
                    customer.city = customer_data.get('city')
                customer.save()

            # 2. Generate Unique Invoice Number
            today = timezone.localdate()
            today_str = today.strftime('%Y%m%d')
            count_today = Sale.objects.filter(sale_date__date=today).count() + 1
            prefix = "EST" if invoice_type == 'ESTIMATE_BILL' else "SSF"
            invoice_num = f"{prefix}-{today_str}-{count_today:03d}"

            # 3. Calculate Totals & Validate Stock
            subtotal = Decimal('0.00')
            total_cogs = Decimal('0.00')
            sale_items_to_create = []

            for item in items_data:
                product_id = item.get('product_id')
                qty = int(item.get('quantity', 1))
                if qty <= 0: continue

                try:
                    product = Product.objects.select_for_update().get(pk=product_id)
                except Product.DoesNotExist:
                    return Response({'success': False, 'message': f"Product ID {product_id} not found."}, status=status.HTTP_400_BAD_REQUEST)

                if product.available_quantity < qty:
                    return Response({
                        'success': False,
                        'message': f"Insufficient stock for '{product.product_name}'. Available: {product.available_quantity}, requested: {qty}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                unit_selling = Decimal(str(item.get('unit_price', product.selling_price)))
                discount = Decimal(str(item.get('discount', 0)))
                line_total = (unit_selling * qty) - discount
                cogs_line = product.purchase_price * qty

                subtotal += line_total
                total_cogs += cogs_line

                sale_items_to_create.append({
                    'product': product,
                    'qty': qty,
                    'unit_purchase': product.purchase_price,
                    'unit_selling': unit_selling,
                    'discount': discount,
                    'line_total': line_total,
                    'cogs_line': cogs_line,
                    'profit_line': line_total - cogs_line
                })

            discount_overall = Decimal(str(data.get('discount_overall', 0)))
            taxable = subtotal - discount_overall
            
            # Tax calculations (18% GST split: 9% CGST + 9% SGST for tax invoices)
            if invoice_type == 'TAX_INVOICE':
                cgst = (taxable * Decimal('9.00')) / Decimal('100.00')
                sgst = (taxable * Decimal('9.00')) / Decimal('100.00')
                grand_total = taxable + cgst + sgst
            else:
                cgst = Decimal('0.00')
                sgst = Decimal('0.00')
                grand_total = taxable

            # 4. Handle Payments (supports split payments like Cash + UPI)
            total_paid = Decimal('0.00')
            payment_records_to_create = []

            for p in payments_data:
                amt = Decimal(str(p.get('amount', 0)))
                if amt > 0:
                    total_paid += amt
                    payment_records_to_create.append({
                        'amount': amt,
                        'mode': (p.get('mode') or p.get('payment_mode') or 'CASH').upper(),
                        'tx_id': p.get('transaction_id', '') or p.get('tx_id', '')
                    })

            balance = grand_total - total_paid
            if balance <= Decimal('0.00'):
                payment_type = 'FULL_PAID'
                balance = Decimal('0.00')
            elif is_emi:
                payment_type = 'EMI'
            elif total_paid > Decimal('0.00'):
                payment_type = 'PARTIAL_PAID'
            else:
                payment_type = 'UNPAID'

            # 5. Determine Sales Rep
            # If staff is logged in, strictly enforce their user account (tamper-proof)
            sales_user = req_user
            if (not sales_user or sales_user.is_superuser) and data.get('employee_id'):
                target_emp = Employee.objects.filter(id=data.get('employee_id')).first()
                if target_emp and target_emp.user:
                    sales_user = target_emp.user

            # Create Sale Record
            sale = Sale.objects.create(
                invoice_number=invoice_num,
                customer=customer,
                subtotal=subtotal,
                discount_amount=discount_overall,
                taxable_amount=taxable,
                cgst_amount=cgst,
                sgst_amount=sgst,
                grand_total=grand_total,
                total_cogs=total_cogs,
                net_profit=grand_total - total_cogs,
                amount_paid=total_paid,
                balance_amount=balance,
                payment_type=payment_type,
                sales_rep=sales_user,
                is_emi_sale=is_emi,
                invoice_type=invoice_type
            )

            # 6. Deduct Stock & Create Sale Items
            for item in sale_items_to_create:
                prod = item['product']
                prev_q = prod.available_quantity
                prod.available_quantity -= item['qty']
                prod.save()

                SaleItem.objects.create(
                    sale=sale,
                    product=prod,
                    quantity=item['qty'],
                    unit_purchase_price=item['unit_purchase'],
                    unit_selling_price=item['unit_selling'],
                    discount_amount=item['discount'],
                    total_price=item['line_total'],
                    cogs_total=item['cogs_line'],
                    item_profit=item['profit_line']
                )

                StockMovement.objects.create(
                    product=prod,
                    movement_type='OUTWARD_SALE',
                    quantity_changed=-item['qty'],
                    previous_quantity=prev_q,
                    new_quantity=prod.available_quantity,
                    reference_type='INVOICE',
                    reference_id=sale.invoice_number,
                    performed_by=sales_user,
                    notes=f"Sold on Bill {sale.invoice_number} by {sales_user.username if sales_user else 'Store Owner'} to {customer.name}"
                )

            # 7. Create Payment records
            for pay in payment_records_to_create:
                Payment.objects.create(
                    payment_reference_no=f"PAY-{uuid.uuid4().hex[:8].upper()}",
                    sale=sale,
                    customer=customer,
                    amount=pay['amount'],
                    payment_mode=pay['mode'],
                    transaction_id=pay['tx_id'],
                    received_by=sales_user,
                    notes=f"Payment for invoice {sale.invoice_number}"
                )

            # 8. Create Customer EMI Account if applicable
            if is_emi:
                total_months = int(emi_plan.get('months', 6))
                principal = grand_total - total_paid
                monthly_installment = (principal / Decimal(total_months)).quantize(Decimal('1.00'))

                emi_acc = EmiAccount.objects.create(
                    emi_account_number=f"EMI-{uuid.uuid4().hex[:6].upper()}",
                    sale=sale,
                    customer=customer,
                    total_amount=grand_total,
                    down_payment=total_paid,
                    principal_amount=principal,
                    total_emi_amount=principal,
                    total_months=total_months,
                    monthly_installment=monthly_installment,
                    paid_amount=Decimal('0.00'),
                    remaining_balance=principal,
                    status='ACTIVE',
                    start_date=today,
                    due_day_of_month=int(emi_plan.get('due_day', 5))
                )

                # Generate EMI Installment Schedules
                due_day = int(emi_plan.get('due_day', 5))
                current_date = today
                for i in range(1, total_months + 1):
                    # Next month due date
                    month = (current_date.month + i - 1) % 12 + 1
                    year = current_date.year + ((current_date.month + i - 1) // 12)
                    due_d = date(year, month, min(due_day, 28))

                    EmiInstallment.objects.create(
                        emi_account=emi_acc,
                        installment_number=i,
                        due_date=due_d,
                        installment_amount=monthly_installment,
                        status='PENDING'
                    )

            # Update customer statistics
            customer.total_spent += grand_total
            customer.total_outstanding += balance
            customer.save()

            # Record audit log
            AuditLog.objects.create(
                user=req_user,
                action='CREATE_SALE',
                entity='sales',
                entity_id=sale.invoice_number,
                details={
                    'invoice': sale.invoice_number,
                    'grand_total': float(grand_total),
                    'customer': customer.name,
                    'staff': req_user.username if req_user else 'Owner'
                }
            )

        fresh_sale = Sale.objects.select_related('customer', 'sales_rep').prefetch_related('items__product', 'payments').get(pk=sale.pk)
        return Response({
            'success': True,
            'message': f"Invoice {sale.invoice_number} created successfully.",
            'sale': SaleSerializer(fresh_sale).data
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def sale_detail(request, invoice_number):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if request.method in ['PUT', 'DELETE'] and req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can edit or delete bills. Staff can create bills only.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        sale = Sale.objects.select_related('customer', 'sales_rep').prefetch_related('items__product', 'payments').get(invoice_number=invoice_number)
    except Sale.DoesNotExist:
        return Response({'success': False, 'message': 'Invoice not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'sale': SaleSerializer(sale).data})

    elif request.method == 'PUT':
        data = request.data
        with transaction.atomic():
            # 1. Update customer details if provided
            if sale.customer:
                if 'customer_name' in data and data['customer_name']:
                    sale.customer.name = data['customer_name'].strip()
                if 'customer_phone' in data and data['customer_phone']:
                    sale.customer.phone = data['customer_phone'].strip()
                if 'customer_address' in data:
                    sale.customer.address = data['customer_address'].strip()
                sale.customer.save()

            # 2. Update payment details
            if 'amount_paid' in data:
                sale.amount_paid = Decimal(str(data['amount_paid']))
                sale.balance_amount = sale.grand_total - sale.amount_paid
                if sale.balance_amount <= Decimal('0.00'):
                    sale.balance_amount = Decimal('0.00')
                    sale.payment_type = 'FULL_PAID'
                elif sale.amount_paid > Decimal('0.00'):
                    sale.payment_type = 'EMI' if sale.is_emi_sale else 'PARTIAL_PAID'
                else:
                    sale.payment_type = 'UNPAID'

            if 'payment_type' in data and data['payment_type']:
                sale.payment_type = data['payment_type']

            if 'notes' in data:
                sale.notes = data['notes']

            if 'invoice_type' in data:
                sale.invoice_type = data['invoice_type']

            # 3. Overall discount or grand total adjustments if passed
            if 'discount_overall' in data:
                sale.discount_overall = Decimal(str(data['discount_overall']))
                taxable = sale.subtotal - sale.discount_overall
                if sale.invoice_type == 'TAX_INVOICE':
                    sale.cgst_amount = (taxable * Decimal('9.00')) / Decimal('100.00')
                    sale.sgst_amount = (taxable * Decimal('9.00')) / Decimal('100.00')
                    sale.grand_total = taxable + sale.cgst_amount + sale.sgst_amount
                else:
                    sale.cgst_amount = Decimal('0.00')
                    sale.sgst_amount = Decimal('0.00')
                    sale.grand_total = taxable
                sale.balance_amount = max(Decimal('0.00'), sale.grand_total - sale.amount_paid)

            sale.save()

        fresh_sale = Sale.objects.select_related('customer', 'sales_rep').prefetch_related('items__product', 'payments').get(pk=sale.pk)
        return Response({
            'success': True,
            'message': f"Invoice {invoice_number} updated successfully.",
            'data': SaleSerializer(fresh_sale).data,
            'sale': SaleSerializer(fresh_sale).data
        })

    elif request.method == 'DELETE':
        with transaction.atomic():
            # Restore stock if not already cancelled
            if not sale.is_cancelled:
                for item in sale.items.all():
                    prod = Product.objects.select_for_update().get(pk=item.product.id)
                    prev_q = prod.available_quantity
                    prod.available_quantity += item.quantity
                    prod.save()
                    StockMovement.objects.create(
                        product=prod,
                        movement_type='SALES_RETURN',
                        quantity_changed=item.quantity,
                        previous_quantity=prev_q,
                        new_quantity=prod.available_quantity,
                        reference_type='BILL_DELETE',
                        reference_id=sale.invoice_number,
                        notes=f"Bill #{sale.invoice_number} deleted: stock restored."
                    )
            if sale.customer and not sale.is_cancelled:
                cust = sale.customer
                cust.total_spent = max(Decimal('0.00'), cust.total_spent - sale.grand_total)
                cust.total_outstanding = max(Decimal('0.00'), cust.total_outstanding - sale.balance_amount)
                cust.save()
            sale.items.all().delete()
            sale.payments.all().delete()
            sale.delete()
        return Response({'success': True, 'message': f"Bill {invoice_number} deleted and stock restored."})

@api_view(['POST'])
@permission_classes([AllowAny])
def cancel_sale(request, invoice_number):
    """
    Cancels a customer bill, automatically restores inventory stock for each product sold,
    records SALES_RETURN stock movement with staff/admin attribution, updates customer balances,
    and logs the cancellation reason for complete audit integrity.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can cancel bills.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        sale = Sale.objects.select_related('customer', 'sales_rep').prefetch_related('items__product').get(invoice_number=invoice_number)
    except Sale.DoesNotExist:
        return Response({'success': False, 'message': f"Bill {invoice_number} not found."}, status=status.HTTP_404_NOT_FOUND)

    if sale.is_cancelled:
        return Response({'success': False, 'message': f"Bill {invoice_number} is already cancelled."}, status=status.HTTP_400_BAD_REQUEST)

    reason = request.data.get('reason', 'Customer bill cancellation / order returned')

    with transaction.atomic():
        # 1. Restore product stock & log stock movement
        for item in sale.items.all():
            prod = Product.objects.select_for_update().get(pk=item.product.id)
            prev_q = prod.available_quantity
            prod.available_quantity += item.quantity
            prod.save()

            StockMovement.objects.create(
                product=prod,
                movement_type='SALES_RETURN',
                quantity_changed=item.quantity,
                previous_quantity=prev_q,
                new_quantity=prod.available_quantity,
                reference_type='BILL_CANCEL',
                reference_id=sale.invoice_number,
                performed_by=req_user,
                notes=f"Bill {sale.invoice_number} cancelled by {req_user.username if req_user else 'Admin'}. Restored {item.quantity} units to stock. Reason: {reason}"
            )

        # 2. Mark sale as cancelled
        sale.is_cancelled = True
        sale.cancellation_reason = reason
        sale.cancelled_at = timezone.now()
        sale.cancelled_by = req_user
        sale.payment_type = 'CANCELLED'
        sale.save()

        # 3. Update customer outstanding / total spent
        cust = sale.customer
        cust.total_spent = max(Decimal('0.00'), cust.total_spent - sale.grand_total)
        cust.total_outstanding = max(Decimal('0.00'), cust.total_outstanding - sale.balance_amount)
        cust.save()

        # 4. If EMI, mark defaulted/cancelled
        if hasattr(sale, 'emi_account'):
            emi_acc = sale.emi_account
            emi_acc.status = 'DEFAULTED'
            emi_acc.save()

        # 5. Audit log
        AuditLog.objects.create(
            user=req_user,
            action='CANCEL_BILL',
            entity='sales',
            entity_id=sale.invoice_number,
            details={'invoice': sale.invoice_number, 'grand_total': float(sale.grand_total), 'reason': reason}
        )

    return Response({
        'success': True,
        'message': f"Bill {sale.invoice_number} has been cancelled successfully. {sale.items.count()} items restored to live inventory stock.",
        'invoice_number': sale.invoice_number
    })

# -----------------------------------------------------------------------------
# 5. CUSTOMER EMI MANAGEMENT
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def emi_account_list(request):
    accounts = EmiAccount.objects.select_related('customer', 'sale').prefetch_related('installments').order_by('-created_at')
    return Response({'success': True, 'count': accounts.count(), 'data': EmiAccountSerializer(accounts, many=True).data})

@api_view(['POST'])
@permission_classes([AllowAny])
def record_emi_payment(request, installment_id):
    """
    Records customer EMI installment payment and auto-updates account balance.
    """
    try:
        installment = EmiInstallment.objects.select_related('emi_account__customer', 'emi_account__sale').get(pk=installment_id)
    except EmiInstallment.DoesNotExist:
        return Response({'success': False, 'message': 'Installment not found.'}, status=status.HTTP_404_NOT_FOUND)

    paid_amt = Decimal(str(request.data.get('amount', installment.installment_amount)))
    mode = request.data.get('payment_mode', 'CASH').upper()
    tx_ref = request.data.get('transaction_ref', '')

    with transaction.atomic():
        installment.paid_amount = paid_amt
        installment.paid_date = timezone.localdate()
        installment.status = 'PAID'
        installment.payment_mode = mode
        installment.transaction_ref = tx_ref
        receipt_no = f"REC-EMI-{uuid.uuid4().hex[:6].upper()}"
        installment.receipt_number = receipt_no
        installment.save()

        # Update parent EMI account
        emi_acc = installment.emi_account
        emi_acc.paid_amount += paid_amt
        emi_acc.remaining_balance -= paid_amt
        if emi_acc.remaining_balance <= Decimal('0.00'):
            emi_acc.remaining_balance = Decimal('0.00')
            emi_acc.status = 'COMPLETED'
        emi_acc.save()

        # Record payment entry
        Payment.objects.create(
            payment_reference_no=receipt_no,
            emi_installment=installment,
            customer=emi_acc.customer,
            amount=paid_amt,
            payment_mode=mode,
            transaction_id=tx_ref,
            notes=f"EMI installment #{installment.installment_number} payment for {emi_acc.customer.name}"
        )

        # Update customer outstanding
        emi_acc.customer.total_outstanding = max(Decimal('0.00'), emi_acc.customer.total_outstanding - paid_amt)
        emi_acc.customer.save()

    return Response({
        'success': True,
        'message': f"Payment of ₹{paid_amt} recorded. Receipt: {receipt_no}",
        'receipt_number': receipt_no,
        'installment': EmiInstallmentSerializer(installment).data,
        'remaining_balance': float(emi_acc.remaining_balance)
    })

# -----------------------------------------------------------------------------
# 6. PURCHASES (Factory & Supplier Inward)
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def purchase_list_create(request):
    if request.method == 'GET':
        purchases = Purchase.objects.select_related('supplier').prefetch_related('items__product').order_by('-purchase_date')
        return Response({'success': True, 'count': purchases.count(), 'data': PurchaseSerializer(purchases, many=True).data})

    elif request.method == 'POST':
        data = request.data
        supplier_id = data.get('supplier_id')
        items = data.get('items', [])

        if not items:
            return Response({'success': False, 'message': 'Purchase items required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            supplier = Supplier.objects.get(pk=supplier_id)
            inv_no = data.get('purchase_invoice_no', f"PUR-{uuid.uuid4().hex[:6].upper()}")
            paid_amount = Decimal(str(data.get('paid_amount', 0)))

            total_amount = Decimal('0.00')
            purchase_items_to_create = []

            for itm in items:
                prod = Product.objects.get(pk=itm['product_id'])
                qty = int(itm['quantity'])
                cost = Decimal(str(itm['unit_cost']))
                tot = cost * qty
                total_amount += tot
                purchase_items_to_create.append((prod, qty, cost, tot))

            bal = total_amount - paid_amount
            p_status = 'PAID' if bal <= 0 else ('PARTIAL' if paid_amount > 0 else 'UNPAID')

            purchase = Purchase.objects.create(
                purchase_invoice_no=inv_no,
                supplier=supplier,
                purchase_date=data.get('purchase_date', timezone.localdate()),
                total_amount=total_amount,
                paid_amount=paid_amount,
                balance_amount=max(Decimal('0.00'), bal),
                payment_status=p_status,
                payment_mode=data.get('payment_mode', 'BANK_TRANSFER'),
                notes=data.get('notes', '')
            )

            for prod, qty, cost, tot in purchase_items_to_create:
                prev_q = prod.available_quantity
                prod.available_quantity += qty
                prod.purchase_price = cost # Update last purchase price
                prod.save()

                PurchaseItem.objects.create(
                    purchase=purchase,
                    product=prod,
                    quantity=qty,
                    unit_cost=cost,
                    total_cost=tot
                )

                StockMovement.objects.create(
                    product=prod,
                    movement_type='INWARD_PURCHASE',
                    quantity_changed=qty,
                    previous_quantity=prev_q,
                    new_quantity=prod.available_quantity,
                    reference_type='PURCHASE',
                    reference_id=purchase.purchase_invoice_no,
                    notes=f"Stock received from {supplier.name}"
                )

            supplier.pending_balance += max(Decimal('0.00'), bal)
            supplier.save()

        return Response({
            'success': True,
            'message': f"Purchase {purchase.purchase_invoice_no} recorded and inventory updated.",
            'purchase': PurchaseSerializer(purchase).data
        }, status=status.HTTP_201_CREATED)

# -----------------------------------------------------------------------------
# 7. PROFIT & LOSS REPORT (Actual Math: Revenue - COGS - Expenses)
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def profit_loss_report(request):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role == 'EMPLOYEE':
        return Response({
            'success': False,
            'message': 'Confidential Financial Data: Staff members are not authorized to view Profit & Loss.'
        }, status=status.HTTP_403_FORBIDDEN)

    period = request.GET.get('period', 'monthly')
    now = get_local_now()

    if period == 'daily':
        start_date = now.replace(hour=0, minute=0, second=0)
    elif period == 'weekly':
        start_date = now - timedelta(days=7)
    elif period == 'yearly':
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0)
    else: # monthly
        start_date = now.replace(day=1, hour=0, minute=0, second=0)

    sales = Sale.objects.filter(sale_date__gte=start_date)
    revenue = sales.aggregate(tot=Sum('grand_total'))['tot'] or Decimal('0.00')
    cogs = sales.aggregate(c=Sum('total_cogs'))['c'] or Decimal('0.00')
    gross_profit = revenue - cogs

    expenses = Expense.objects.filter(expense_date__gte=start_date.date())
    total_expenses = expenses.aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')

    # Breakdown of expenses by category
    expense_breakdown = {}
    for cat_key, cat_name in Expense.CATEGORY_CHOICES:
        cat_sum = expenses.filter(category=cat_key).aggregate(s=Sum('amount'))['s'] or Decimal('0.00')
        expense_breakdown[cat_name] = float(cat_sum)

    net_profit = gross_profit - total_expenses
    profit_margin = ((net_profit / revenue) * Decimal('100.00')) if revenue > 0 else Decimal('0.00')

    return Response({
        'success': True,
        'period': period,
        'salesRevenue': float(revenue),
        'costOfGoodsSold': float(cogs),
        'grossProfit': float(gross_profit),
        'operatingExpenses': float(total_expenses),
        'netProfit': float(net_profit),
        'isProfitable': net_profit >= 0,
        'netProfitMarginPercent': round(float(profit_margin), 2),
        'expenseBreakdown': expense_breakdown
    })

# -----------------------------------------------------------------------------
# 8. EXPENSES
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def expense_list_create(request):
    if request.method == 'GET':
        expenses = Expense.objects.order_by('-expense_date')
        return Response({'success': True, 'count': expenses.count(), 'data': ExpenseSerializer(expenses, many=True).data})

    elif request.method == 'POST':
        data = request.data
        expense = Expense.objects.create(
            expense_code=f"EXP-{uuid.uuid4().hex[:6].upper()}",
            category=data.get('category', 'MISCELLANEOUS'),
            amount=Decimal(str(data.get('amount', 0))),
            expense_date=data.get('expense_date', timezone.localdate()),
            payment_mode=data.get('payment_mode', 'CASH'),
            paid_to=data.get('paid_to', ''),
            description=data.get('description', '')
        )
        return Response({'success': True, 'message': 'Expense recorded.', 'data': ExpenseSerializer(expense).data}, status=status.HTTP_201_CREATED)

# -----------------------------------------------------------------------------
# 9. EMPLOYEES SALES PERFORMANCE & OPENING/CLOSING CASH REGISTERS
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# 9. STAFF MANAGEMENT & STAFF LOGIN SYSTEM
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def employee_list_create(request):
    """
    Owner Staff Management:
    GET: Returns all staff with sales performance, attendance today, active status and credentials info.
    POST: Creates a full staff login account with credentials and permissions.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    if request.method == 'GET':
        include_inactive = request.GET.get('all', 'true') == 'true'
        employees = Employee.objects.all().order_by('name') if include_inactive else Employee.objects.filter(is_active=True).order_by('name')

        today = timezone.localdate()
        all_sales = Sale.objects.all()
        today_sales_all = all_sales.filter(sale_date__date=today)
        today_attendance = {att.employee_id: att for att in Attendance.objects.filter(date=today)}

        data = []
        for emp in employees:
            item = EmployeeSerializer(emp).data
            # Sales linked to user
            emp_sales = all_sales.filter(sales_rep=emp.user) if emp.user else Sale.objects.none()
            emp_today = today_sales_all.filter(sales_rep=emp.user) if emp.user else Sale.objects.none()

            tot_amt = float(emp_sales.aggregate(s=Sum('grand_total'))['s'] or 0)
            b_cnt = emp_sales.count()
            tod_amt = float(emp_today.aggregate(s=Sum('grand_total'))['s'] or 0)
            tod_cnt = emp_today.count()

            # Today Attendance info
            att = today_attendance.get(emp.id)
            att_info = {
                'status': att.status if att else 'NOT_MARKED',
                'check_in_time': att.check_in_time.strftime('%I:%M %p') if (att and att.check_in_time) else None,
                'check_out_time': att.check_out_time.strftime('%I:%M %p') if (att and att.check_out_time) else None,
                'working_hours': float(att.working_hours) if att else 0.0,
            }

            item['total_sales'] = tot_amt
            item['bills_count'] = b_cnt
            item['today_sales'] = tod_amt
            item['today_bills_count'] = tod_cnt
            item['is_selling_today'] = tod_cnt > 0 or tod_amt > 0
            item['attendance_today'] = att_info
            data.append(item)

        return Response({'success': True, 'count': len(data), 'data': data})

    elif request.method == 'POST':
        req_user, err_res = require_owner_request(request)
        if err_res:
            return err_res
        data = request.data
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip() or data.get('temporary_password', '').strip()
        emp_code = data.get('employee_code', '').strip() or f"SSF-EMP-{(Employee.objects.count() + 1):03d}"

        if not name:
            return Response({'success': False, 'message': 'Full name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not phone:
            return Response({'success': False, 'message': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check unique employee code
        if Employee.objects.filter(employee_code=emp_code).exists():
            emp_code = f"SSF-EMP-{uuid.uuid4().hex[:4].upper()}"

        with transaction.atomic():
            # If username not provided, auto-generate a clean login ID
            if not username:
                username = emp_code.lower().replace('-', '').replace(' ', '')
                if User.objects.filter(username__iexact=username).exists():
                    username = f"staff_{(Employee.objects.count() + 1):02d}"

            # Check if username already taken
            if User.objects.filter(username__iexact=username).exists():
                return Response({'success': False, 'message': f"Login ID '{username}' is already taken. Please choose another Login ID."}, status=status.HTTP_400_BAD_REQUEST)

            raw_pass = password or 'staff123'
            user = User.objects.create_user(
                username=username.lower(),
                password=raw_pass,
                email=data.get('email', '') or f"{username.lower()}@shahinsteel.com",
                first_name=name.split(' ')[0],
                last_name=' '.join(name.split(' ')[1:]) if ' ' in name else ''
            )
            user.set_password(raw_pass)
            user.save()

            role, _ = Role.objects.get_or_create(name='EMPLOYEE', defaults={'display_name': 'Sales Staff'})
            UserProfile.objects.create(
                user=user,
                role=role,
                phone=phone,
                is_active=data.get('is_active', True)
            )

            emp = Employee.objects.create(
                user=user,
                employee_code=emp_code,
                name=name,
                phone=phone,
                email=data.get('email', ''),
                designation=data.get('designation', 'Sales Executive'),
                base_salary=Decimal(str(data.get('base_salary', data.get('monthly_salary', 0)))),
                joining_date=data.get('joining_date', timezone.localdate()),
                address=data.get('address', ''),
                emergency_contact=data.get('emergency_contact', ''),
                is_active=data.get('is_active', True),

                # Individual Granular Permissions
                can_manage_sales=data.get('can_manage_sales', True),
                can_edit_sales=data.get('can_edit_sales', False),
                can_give_discount=data.get('can_give_discount', True),
                can_print_invoices=data.get('can_print_invoices', True),
                can_manage_customers=data.get('can_manage_customers', True),
                can_view_inventory=data.get('can_view_inventory', True),
                can_adjust_stock=data.get('can_adjust_stock', False),
                can_view_emi=data.get('can_view_emi', True),
                can_collect_emi=data.get('can_collect_emi', True),
                can_manage_attendance=data.get('can_manage_attendance', True),
                can_manage_purchases=data.get('can_manage_purchases', False),
                can_manage_expenses=data.get('can_manage_expenses', False),
                can_view_reports=data.get('can_view_reports', False)
            )

            # Record in AuditLog
            AuditLog.objects.create(
                user=req_user,
                action='STAFF_CREATED',
                entity='employees',
                entity_id=str(emp.id),
                details={'name': emp.name, 'code': emp.employee_code, 'username': user.username}
            )

        return Response({
            'success': True,
            'message': f"Staff account for '{emp.name}' ({emp.employee_code}) created successfully with Login ID '{user.username}'.",
            'data': EmployeeSerializer(emp).data
        }, status=status.HTTP_201_CREATED)

@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def staff_detail_update(request, pk):
    req_user, err_res = require_owner_request(request)
    if err_res:
        return err_res
    try:
        emp = Employee.objects.select_related('user').get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'success': False, 'message': 'Staff record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        data = request.data
        if is_owner_user(emp.user) and data.get('password', '').strip():
            return Response(
                {'success': False, 'message': 'Primary Store Owner password cannot be changed from Staff Management.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'name' in data: emp.name = data['name'].strip()
        if 'phone' in data: emp.phone = data['phone'].strip()
        if 'email' in data: emp.email = data['email'].strip()
        if 'designation' in data: emp.designation = data['designation'].strip()
        if 'address' in data: emp.address = data['address'].strip()
        if 'monthly_salary' in data: emp.base_salary = Decimal(str(data['monthly_salary']))
        elif 'base_salary' in data: emp.base_salary = Decimal(str(data['base_salary']))
        if 'joining_date' in data and data['joining_date']: emp.joining_date = data['joining_date']
        if 'is_active' in data and not is_owner_user(emp.user):
            emp.is_active = bool(data['is_active'])
            if emp.user:
                emp.user.is_active = emp.is_active
                emp.user.save()
        if 'username' in data and data['username'].strip():
            new_u = data['username'].strip().lower()
            if not emp.user:
                raw_p = data.get('password', '').strip() or 'staff123'
                new_user = User.objects.create_user(
                    username=new_u,
                    password=raw_p,
                    email=emp.email or f"{new_u}@shahinsteel.com"
                )
                new_user.set_password(raw_p)
                new_user.save()
                role, _ = Role.objects.get_or_create(name='EMPLOYEE', defaults={'display_name': 'Sales Staff'})
                UserProfile.objects.create(user=new_user, role=role, phone=emp.phone)
                emp.user = new_user
            else:
                if User.objects.filter(username__iexact=new_u).exclude(pk=emp.user.pk).exists():
                    return Response({'success': False, 'message': f"Login ID '{new_u}' is already taken. Please choose another Login ID."}, status=status.HTTP_400_BAD_REQUEST)
                # Keep primary Owner username and password intact so Owner login always works
                if not is_owner_user(emp.user):
                    emp.user.username = new_u
                    if 'password' in data and data['password'].strip():
                        emp.user.set_password(data['password'].strip())
                emp.user.save()
        elif 'password' in data and data['password'].strip() and emp.user and not is_owner_user(emp.user):
            emp.user.set_password(data['password'].strip())
            emp.user.save()
        emp.save()
        return Response({
            'success': True,
            'message': f"Employee profile for {emp.name} updated.",
            'data': EmployeeSerializer(emp).data
        })

    elif request.method == 'DELETE':
        if is_owner_user(emp.user) or emp.user == req_user:
            return Response(
                {'success': False, 'message': 'Primary Store Owner account cannot be deactivated or deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        hard_delete = str(request.query_params.get('hard_delete', '')).lower() in ('1', 'true', 'yes')
        emp_name = emp.name
        emp_id = emp.id
        emp_code = emp.employee_code

        if hard_delete:
            linked_user = emp.user
            username = linked_user.username if linked_user else None
            with transaction.atomic():
                emp.delete()
                if linked_user:
                    linked_user.delete()

            AuditLog.objects.create(
                user=req_user,
                action='STAFF_DELETED_PERMANENTLY',
                entity='employees',
                entity_id=str(emp_id),
                details={'name': emp_name, 'code': emp_code, 'username': username}
            )
            return Response({
                'success': True,
                'message': f"Employee '{emp_name}' permanently deleted. Past sales, invoices, and payment records remain intact."
            })

        # Soft deactivate ("Left Shop"): login disabled, past sales & records intact
        emp.is_active = False
        if emp.user:
            emp.user.is_active = False
            emp.user.save()
            if hasattr(emp.user, 'profile'):
                emp.user.profile.is_active = False
                emp.user.profile.save()
        emp.save()

        # Audit log for staff leaving shop
        AuditLog.objects.create(
            user=req_user,
            action='STAFF_LEFT_SHOP',
            entity='employees',
            entity_id=str(emp.id),
            details={'name': emp_name, 'reason': 'Left shop / Deactivated by Admin. All past sales preserved.'}
        )

        return Response({
            'success': True,
            'message': f"Staff '{emp_name}' marked as Left Shop (Inactive). Login disabled. All past sales, invoices, and records remain 100% intact in Admin."
        })

@api_view(['PUT'])
@permission_classes([AllowAny])
def staff_permissions_update(request, pk):
    """
    Owner Permission Control: Enable/disable individual permissions for staff.
    """
    req_user, err_res = require_owner_request(request)
    if err_res:
        return err_res
    try:
        emp = Employee.objects.get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'success': False, 'message': 'Staff record not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    fields = [
        'can_manage_sales', 'can_edit_sales', 'can_give_discount', 'can_print_invoices',
        'can_manage_customers', 'can_view_inventory', 'can_adjust_stock', 'can_view_emi',
        'can_collect_emi', 'can_manage_attendance', 'can_manage_purchases', 'can_manage_expenses',
        'can_view_reports'
    ]
    for f in fields:
        if f in data:
            setattr(emp, f, bool(data[f]))
    emp.save()

    AuditLog.objects.create(
        user=req_user,
        action='PERMISSIONS_UPDATED',
        entity='employees',
        entity_id=str(emp.id),
        details={'staff': emp.name, 'permissions': {f: getattr(emp, f) for f in fields}}
    )

    return Response({
        'success': True,
        'message': f"Permissions successfully updated for {emp.name}.",
        'data': EmployeeSerializer(emp).data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def staff_reset_password(request, pk):
    """
    Owner resets staff temporary password.
    """
    req_user, err_res = require_owner_request(request)
    if err_res:
        return err_res
    try:
        emp = Employee.objects.select_related('user').get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'success': False, 'message': 'Staff record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if is_owner_user(emp.user):
        return Response(
            {'success': False, 'message': 'Primary Store Owner password cannot be reset from Staff Management.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_password = request.data.get('new_password', '').strip()
    if not new_password:
        return Response({'success': False, 'message': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not emp.user:
        username = emp.employee_code.lower().replace('-', '')
        user = User.objects.create_user(username=username, password=new_password, email=emp.email or f"{username}@shahinsteel.com")
        role, _ = Role.objects.get_or_create(name='EMPLOYEE', defaults={'display_name': 'Sales Staff'})
        UserProfile.objects.create(user=user, role=role, phone=emp.phone)
        emp.user = user
        emp.save()
    else:
        emp.user.set_password(new_password)
        emp.user.save()

    AuditLog.objects.create(
        user=req_user,
        action='PASSWORD_RESET',
        entity='employees',
        entity_id=str(emp.id),
        details={'staff': emp.name, 'username': emp.user.username}
    )

    return Response({
        'success': True,
        'message': f"Password for {emp.name} ({emp.user.username}) updated successfully."
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def staff_toggle_status(request, pk):
    """
    Owner toggles active/inactive account status.
    """
    _, err_res = require_owner_request(request)
    if err_res:
        return err_res
    try:
        emp = Employee.objects.select_related('user').get(pk=pk)
    except Employee.DoesNotExist:
        return Response({'success': False, 'message': 'Staff record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if is_owner_user(emp.user):
        return Response(
            {'success': False, 'message': 'Primary Store Owner account cannot be deactivated.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    emp.is_active = not emp.is_active
    if emp.user:
        emp.user.is_active = emp.is_active
        emp.user.save()
        if hasattr(emp.user, 'profile'):
            emp.user.profile.is_active = emp.is_active
            emp.user.profile.save()
    emp.save()

    status_str = "ACTIVE" if emp.is_active else "DEACTIVATED"
    return Response({
        'success': True,
        'message': f"Staff account for {emp.name} is now {status_str}.",
        'is_active': emp.is_active
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def staff_dashboard_stats(request):
    """
    Staff Dashboard API:
    Shows personal sales, products sold, collections (Cash vs UPI), attendance status,
    recent personal sales, and weekly trend.
    STRICTLY OMITS all owner confidential financials (no profit, no shop expense/rent, no store-wide turnover).
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    # Resolve target employee
    emp = req_emp
    if not emp and request.GET.get('employee_id'):
        emp = Employee.objects.filter(id=request.GET.get('employee_id')).first()
    if not emp and req_user:
        emp = Employee.objects.filter(user=req_user).first()
    if not emp:
        emp = Employee.objects.first()

    today = timezone.localdate()

    # Sales by this staff member
    if emp and emp.user:
        staff_sales = Sale.objects.filter(sales_rep=emp.user)
    elif req_user and not req_user.is_superuser:
        staff_sales = Sale.objects.filter(sales_rep=req_user)
    else:
        # If owner viewing staff dashboard mode or demo fallback
        staff_sales = Sale.objects.all()

    today_sales = staff_sales.filter(sale_date__date=today)
    today_sales_amount = float(today_sales.aggregate(s=Sum('grand_total'))['s'] or 0)
    today_bills_count = today_sales.count()

    today_products_sold = int(SaleItem.objects.filter(sale__in=today_sales).aggregate(q=Sum('quantity'))['q'] or 0)

    # Payment collections today by this staff member
    if emp and emp.user:
        today_payments = Payment.objects.filter(received_by=emp.user, payment_date__date=today)
    elif req_user and not req_user.is_superuser:
        today_payments = Payment.objects.filter(received_by=req_user, payment_date__date=today)
    else:
        today_payments = Payment.objects.filter(payment_date__date=today)

    cash_coll = float(today_payments.filter(payment_mode='CASH').aggregate(s=Sum('amount'))['s'] or 0)
    upi_coll = float(today_payments.filter(payment_mode='UPI').aggregate(s=Sum('amount'))['s'] or 0)
    online_coll = float(today_payments.filter(payment_mode__in=['ONLINE', 'BANK_TRANSFER']).aggregate(s=Sum('amount'))['s'] or 0)
    total_coll = cash_coll + upi_coll + online_coll

    # Attendance Status Today
    att = Attendance.objects.filter(employee=emp, date=today).first() if emp else None
    attendance_data = {
        'has_checked_in': bool(att and att.check_in_time),
        'check_in_time': att.check_in_time.strftime('%I:%M %p') if (att and att.check_in_time) else None,
        'has_checked_out': bool(att and att.check_out_time),
        'check_out_time': att.check_out_time.strftime('%I:%M %p') if (att and att.check_out_time) else None,
        'working_hours': float(att.working_hours) if att else 0.0,
        'status': att.status if att else 'NOT_MARKED',
        'notes': att.notes if att else '',
        'date': today.strftime('%d %b %Y')
    }

    # Recent Personal Sales
    recent_sales_list = []
    for s in staff_sales.select_related('customer').order_by('-sale_date')[:6]:
        recent_sales_list.append({
            'id': s.id,
            'invoice_number': s.invoice_number,
            'customer_name': s.customer.name,
            'customer_phone': s.customer.phone,
            'amount': float(s.grand_total),
            'amount_paid': float(s.amount_paid),
            'payment_type': s.payment_type,
            'date': timezone.localtime(s.sale_date).strftime('%d %b %Y, %I:%M %p')
        })

    # Weekly Personal Sales Trend (last 7 days)
    weekly_trend = []
    for i in range(6, -1, -1):
        day_d = today - timedelta(days=i)
        day_sales = staff_sales.filter(sale_date__date=day_d)
        weekly_trend.append({
            'date': day_d.strftime('%a'),
            'full_date': day_d.strftime('%d %b'),
            'amount': float(day_sales.aggregate(s=Sum('grand_total'))['s'] or 0),
            'bills': day_sales.count()
        })

    # Low Stock Items count (for sales staff advising customers)
    low_stock_count = Product.objects.filter(is_active=True, available_quantity__lte=F('minimum_stock')).count()
    pending_emi_count = EmiInstallment.objects.filter(status='OVERDUE').count()

    return Response({
        'success': True,
        'staff_name': emp.name if emp else (req_user.username if req_user else 'Sales Staff'),
        'staff_code': emp.employee_code if emp else 'SSF-STAFF',
        'designation': emp.designation if emp else 'Sales Executive',
        'today_sales': today_sales_amount,
        'today_bills_count': today_bills_count,
        'today_products_sold': today_products_sold,
        'today_collections': {
            'cash': cash_coll,
            'upi': upi_coll,
            'online': online_coll,
            'total': total_coll
        },
        'attendance': attendance_data,
        'recent_sales': recent_sales_list,
        'weekly_trend': weekly_trend,
        'low_stock_count': low_stock_count,
        'pending_emi_reminders': pending_emi_count
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def staff_attendance_check_in(request):
    """
    Staff Check-In: Records check_in_time with duplicate check-in prevention.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    emp_id = request.data.get('employee_id')
    emp = None
    if emp_id:
        emp = Employee.objects.filter(id=emp_id).first()
    if not emp:
        emp = req_emp
    if not emp and req_user:
        emp = Employee.objects.filter(user=req_user).first()
    if not emp:
        emp = Employee.objects.first()

    if not emp:
        return Response({'success': False, 'message': 'Employee record not found.'}, status=status.HTTP_404_NOT_FOUND)

    local_now = get_local_now()
    today = local_now.date()
    att = Attendance.objects.filter(employee=emp, date=today).first()

    if att and att.check_in_time:
        return Response({
            'success': False,
            'message': f"You have already checked in today at {att.check_in_time.strftime('%I:%M %p')}. Duplicate check-in is prevented.",
            'data': AttendanceSerializer(att).data
        }, status=status.HTTP_400_BAD_REQUEST)

    now_time = local_now.time()
    if not att:
        att = Attendance.objects.create(
            employee=emp,
            date=today,
            status='PRESENT',
            check_in_time=now_time,
            notes='Mobile / Web Shift Check-in'
        )
    else:
        att.check_in_time = now_time
        att.status = 'PRESENT'
        att.save()

    return Response({
        'success': True,
        'message': f"{get_time_greeting(local_now)}, {emp.name}! Checked in at {now_time.strftime('%I:%M %p')}.",
        'data': AttendanceSerializer(att).data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def staff_attendance_check_out(request):
    """
    Staff Check-Out: Records check_out_time and computes accurate working hours.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    emp_id = request.data.get('employee_id')
    emp = None
    if emp_id:
        emp = Employee.objects.filter(id=emp_id).first()
    if not emp:
        emp = req_emp
    if not emp and req_user:
        emp = Employee.objects.filter(user=req_user).first()
    if not emp:
        emp = Employee.objects.first()

    if not emp:
        return Response({'success': False, 'message': 'Employee record not found.'}, status=status.HTTP_404_NOT_FOUND)

    local_now = get_local_now()
    today = local_now.date()
    att = Attendance.objects.filter(employee=emp, date=today).first()

    if not att or not att.check_in_time:
        return Response({
            'success': False,
            'message': 'Cannot check out: You must check in first before checking out.'
        }, status=status.HTTP_400_BAD_REQUEST)

    now_time = local_now.time()
    att.check_out_time = now_time

    # Calculate working hours
    t_in = att.check_in_time
    t_out = now_time
    hours = (t_out.hour - t_in.hour) + (t_out.minute - t_in.minute) / 60.0 + (t_out.second - t_in.second) / 3600.0
    if hours < 0:
        hours = 0.0
    att.working_hours = Decimal(str(round(hours, 2)))
    att.save()

    return Response({
        'success': True,
        'message': f"Checked out at {now_time.strftime('%I:%M %p')}. Total shift logged: {round(hours, 2)} hours.",
        'data': AttendanceSerializer(att).data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def staff_mark_half_day(request):
    """
    Staff Half-Day Leave:
    Allows a staff member to clock out early or request Half-Day Leave.
    Sets status to 'HALF_DAY', assigns half-day hours (4.00 hrs),
    and records check_out_time and reason.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    emp_id = request.data.get('employee_id')
    emp = None
    if emp_id:
        emp = Employee.objects.filter(id=emp_id).first()
    if not emp:
        emp = req_emp
    if not emp and req_user:
        emp = Employee.objects.filter(user=req_user).first()
    if not emp:
        emp = Employee.objects.first()

    if not emp:
        return Response({'success': False, 'message': 'Employee record not found.'}, status=status.HTTP_404_NOT_FOUND)

    local_now = get_local_now()
    today = local_now.date()
    now_time = local_now.time()
    notes = request.data.get('notes') or request.data.get('reason') or 'Half Day Leave'

    att = Attendance.objects.filter(employee=emp, date=today).first()
    if not att:
        att = Attendance.objects.create(
            employee=emp,
            date=today,
            status='HALF_DAY',
            check_in_time=now_time,
            check_out_time=now_time,
            working_hours=Decimal('4.00'),
            notes=f"{notes} (Departed: {now_time.strftime('%I:%M %p')})"
        )
    else:
        att.status = 'HALF_DAY'
        att.check_out_time = now_time
        if not att.check_in_time:
            att.check_in_time = now_time
        att.working_hours = Decimal('4.00')
        att.notes = f"{notes} (Departed: {now_time.strftime('%I:%M %p')})"
        att.save()

    return Response({
        'success': True,
        'message': f"Half-Day Leave recorded for {emp.name} at {now_time.strftime('%I:%M %p')}.",
        'data': AttendanceSerializer(att).data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def staff_mark_leave(request):
    """
    Staff Full-Day Leave:
    Allows a staff member to record full day leave for today.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    emp_id = request.data.get('employee_id')
    emp = None
    if emp_id:
        emp = Employee.objects.filter(id=emp_id).first()
    if not emp:
        emp = req_emp
    if not emp and req_user:
        emp = Employee.objects.filter(user=req_user).first()
    if not emp:
        emp = Employee.objects.first()

    if not emp:
        return Response({'success': False, 'message': 'Employee record not found.'}, status=status.HTTP_404_NOT_FOUND)

    today = timezone.localdate()
    reason = request.data.get('notes') or request.data.get('reason') or 'Full Day Leave'
    att, created = Attendance.objects.update_or_create(
        employee=emp,
        date=today,
        defaults={
            'status': 'LEAVE',
            'working_hours': Decimal('0.00'),
            'notes': reason
        }
    )
    return Response({
        'success': True,
        'message': f"Full-Day Leave recorded for {emp.name}.",
        'data': AttendanceSerializer(att).data
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def staff_attendance_history(request):
    """
    Attendance history and monthly summary for staff or owner.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    emp = None
    emp_id = request.GET.get('employee_id')
    if emp_id:
        emp = Employee.objects.filter(id=emp_id).first()
    elif req_emp:
        emp = req_emp
    elif req_user and req_role == 'EMPLOYEE':
        emp = Employee.objects.filter(user=req_user).first()

    records = Attendance.objects.select_related('employee').all().order_by('-date')
    if emp:
        records = records.filter(employee=emp)

    recent_records = list(records[:60])
    days_present = sum(1 for r in recent_records if r.status == 'PRESENT')
    days_half = sum(1 for r in recent_records if r.status == 'HALF_DAY')
    days_leave = sum(1 for r in recent_records if r.status == 'LEAVE')
    total_hours = float(sum((r.working_hours or 0) for r in recent_records))

    return Response({
        'success': True,
        'count': len(recent_records),
        'summary': {
            'days_present': days_present,
            'days_half_day': days_half,
            'days_leave': days_leave,
            'total_hours': total_hours,
        },
        'data': AttendanceSerializer(recent_records, many=True).data
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def staff_my_profile(request):
    """
    My Profile view for logged-in staff member.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)

    emp = req_emp
    if not emp and req_user:
        emp = Employee.objects.filter(user=req_user).first()
    if not emp and request.GET.get('employee_id'):
        emp = Employee.objects.filter(id=request.GET.get('employee_id')).first()
    if not emp:
        emp = Employee.objects.first()

    if not emp:
        return Response({'success': False, 'message': 'Profile record not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Lifetime sales stats for this staff
    sales = Sale.objects.filter(sales_rep=emp.user) if emp.user else Sale.objects.none()
    total_sales_amt = float(sales.aggregate(s=Sum('grand_total'))['s'] or 0)
    invoices_count = sales.count()

    # Attendance stats for this month
    this_month = timezone.localdate().replace(day=1)
    month_att = Attendance.objects.filter(employee=emp, date__gte=this_month)
    present_days = month_att.filter(status='PRESENT').count()
    total_month_hours = float(month_att.aggregate(h=Sum('working_hours'))['h'] or 0)

    return Response({
        'success': True,
        'profile': {
            'id': emp.id,
            'name': emp.name,
            'employee_code': emp.employee_code,
            'username': emp.user.username if emp.user else 'No Account',
            'designation': emp.designation,
            'phone': emp.phone,
            'email': emp.email,
            'address': emp.address,
            'joining_date': emp.joining_date.strftime('%d %B %Y') if emp.joining_date else '',
            'is_active': emp.is_active,
            'permissions': {
                'can_manage_sales': emp.can_manage_sales,
                'can_edit_sales': emp.can_edit_sales,
                'can_give_discount': emp.can_give_discount,
                'can_print_invoices': emp.can_print_invoices,
                'can_manage_customers': emp.can_manage_customers,
                'can_view_inventory': emp.can_view_inventory,
                'can_adjust_stock': emp.can_adjust_stock,
                'can_view_emi': emp.can_view_emi,
                'can_collect_emi': emp.can_collect_emi,
                'can_manage_attendance': emp.can_manage_attendance,
            }
        },
        'sales_performance': {
            'total_sales': total_sales_amt,
            'invoices_count': invoices_count,
        },
        'attendance_stats': {
            'present_days_this_month': present_days,
            'total_hours_this_month': total_month_hours,
        }
    })

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def cash_register_list_create(request):
    """
    Daily Opening & Closing Balance Management for showroom counters/employees.
    """
    today = timezone.localdate()
    if request.method == 'GET':
        # Auto compute today's cash and upi sales from Payments
        today_cash = Payment.objects.filter(payment_date__date=today, payment_mode='CASH').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
        today_upi = Payment.objects.filter(payment_date__date=today, payment_mode='UPI').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')

        registers = CashRegister.objects.select_related('employee').all()
        # If open register exists for today, update its cash_sales and expected_cash
        open_reg = registers.filter(register_date=today, status='OPEN').first()
        if open_reg:
            open_reg.cash_sales = today_cash
            open_reg.upi_sales = today_upi
            open_reg.expected_cash = open_reg.opening_balance + today_cash
            open_reg.save()

        return Response({
            'success': True,
            'count': registers.count(),
            'today_cash_sales': float(today_cash),
            'today_upi_sales': float(today_upi),
            'data': CashRegisterSerializer(registers, many=True).data
        })

    elif request.method == 'POST':
        data = request.data
        employee_id = data.get('employee_id')
        opening_bal = Decimal(str(data.get('opening_balance', 0)))
        notes = data.get('notes', '')

        today_cash = Payment.objects.filter(payment_date__date=today, payment_mode='CASH').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
        today_upi = Payment.objects.filter(payment_date__date=today, payment_mode='UPI').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')

        reg = CashRegister.objects.create(
            employee_id=employee_id if employee_id else None,
            register_date=today,
            opening_balance=opening_bal,
            cash_sales=today_cash,
            upi_sales=today_upi,
            expected_cash=opening_bal + today_cash,
            status='OPEN',
            notes=notes
        )
        return Response({
            'success': True,
            'message': f"Cash counter opened with starting balance of ₹{opening_bal}.",
            'data': CashRegisterSerializer(reg).data
        }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def cash_register_close(request, pk):
    """
    Submits closing cash count, tallies difference (surplus/shortage) and closes shift.
    """
    try:
        reg = CashRegister.objects.get(pk=pk)
    except CashRegister.DoesNotExist:
        return Response({'success': False, 'message': 'Register not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    closing_cash = Decimal(str(data.get('closing_cash', 0)))
    notes = data.get('notes', reg.notes)

    # Recalculate sales for that day
    day_cash = Payment.objects.filter(payment_date__date=reg.register_date, payment_mode='CASH').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')
    day_upi = Payment.objects.filter(payment_date__date=reg.register_date, payment_mode='UPI').aggregate(tot=Sum('amount'))['tot'] or Decimal('0.00')

    reg.cash_sales = day_cash
    reg.upi_sales = day_upi
    reg.expected_cash = reg.opening_balance + day_cash
    reg.closing_cash = closing_cash
    reg.difference = closing_cash - reg.expected_cash
    reg.status = 'CLOSED'
    reg.closed_at = timezone.now()
    if notes:
        reg.notes = notes
    reg.save()

    return Response({
        'success': True,
        'message': f"Register closed. Counted ₹{closing_cash}. Difference: ₹{reg.difference}",
        'data': CashRegisterSerializer(reg).data
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def record_attendance(request):
    data = request.data
    emp_id = data.get('employee_id')
    att_date = data.get('date', timezone.localdate())
    status_val = data.get('status', 'PRESENT')

    att, created = Attendance.objects.update_or_create(
        employee_id=emp_id,
        date=att_date,
        defaults={'status': status_val, 'notes': data.get('notes', '')}
    )
    return Response({'success': True, 'message': 'Attendance recorded.', 'data': AttendanceSerializer(att).data})

# -----------------------------------------------------------------------------
# 10. CUSTOMERS DIRECTORY & CREATION
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def customer_list(request):
    if request.method == 'GET':
        customers = Customer.objects.order_by('-total_spent')
        return Response({'success': True, 'count': customers.count(), 'data': CustomerSerializer(customers, many=True).data})

    elif request.method == 'POST':
        data = request.data
        phone = data.get('phone', '').strip()
        if not phone:
            return Response({'success': False, 'message': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        customer, created = Customer.objects.get_or_create(
            phone=phone,
            defaults={
                'name': data.get('name', 'Valued Customer'),
                'customer_code': data.get('customer_code') or f"CUST-{uuid.uuid4().hex[:6].upper()}",
                'alternate_phone': data.get('alternate_phone', ''),
                'email': data.get('email', ''),
                'address': data.get('address', ''),
                'city': data.get('city', 'Bokaro'),
                'state': data.get('state', 'Jharkhand'),
                'pincode': data.get('pincode', '827013'),
            }
        )
        if not created:
            customer.name = data.get('name', customer.name)
            if data.get('address'): customer.address = data.get('address')
            if data.get('city'): customer.city = data.get('city')
            customer.save()

        return Response({
            'success': True,
            'message': 'Customer saved successfully.',
            'data': CustomerSerializer(customer).data
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def customer_detail(request, pk):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if request.method in ['PUT', 'DELETE'] and req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can edit or delete customer profiles. Staff can add new customers only.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        customer = Customer.objects.get(pk=pk)
    except Customer.DoesNotExist:
        return Response({'success': False, 'message': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'data': CustomerSerializer(customer).data})

    elif request.method == 'PUT':
        data = request.data
        if 'name' in data and data['name']: customer.name = data['name']
        if 'phone' in data and data['phone']: customer.phone = data['phone']
        if 'alternate_phone' in data: customer.alternate_phone = data['alternate_phone']
        if 'email' in data: customer.email = data['email']
        if 'address' in data: customer.address = data['address']
        if 'city' in data: customer.city = data['city']
        if 'state' in data: customer.state = data['state']
        if 'pincode' in data: customer.pincode = data['pincode']
        if 'total_outstanding' in data:
            customer.total_outstanding = Decimal(str(data['total_outstanding']))
        elif 'opening_balance' in data:
            customer.total_outstanding = Decimal(str(data['opening_balance']))
        customer.save()
        return Response({
            'success': True,
            'message': 'Customer updated successfully.',
            'data': CustomerSerializer(customer).data
        })

    elif request.method == 'DELETE':
        try:
            customer.delete()
            return Response({'success': True, 'message': 'Customer deleted successfully.'})
        except Exception as e:
            return Response({
                'success': False,
                'message': f"Cannot delete customer '{customer.name}': This customer has linked sales invoices or EMI records. Please cancel or delete their invoices first."
            }, status=status.HTTP_400_BAD_REQUEST)

# -----------------------------------------------------------------------------
# 11. MULTI-DEVICE SYNC STATUS & AUDIT
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def sync_status(request):
    """
    Returns latest state hashes and timestamps for instant multi-device reactivity.
    """
    last_sale = Sale.objects.order_by('-created_at').first()
    last_movement = StockMovement.objects.order_by('-movement_date').first()
    last_payment = Payment.objects.order_by('-created_at').first()

    return Response({
        'success': True,
        'cloudSync': True,
        'database': 'MySQL Cloud Relational DB',
        'serverTime': timezone.now().isoformat(),
        'lastSaleId': last_sale.invoice_number if last_sale else None,
        'lastSaleTime': last_sale.created_at.isoformat() if last_sale else None,
        'lastStockMovementTime': last_movement.movement_date.isoformat() if last_movement else None,
        'lastPaymentTime': last_payment.created_at.isoformat() if last_payment else None,
    })

# -----------------------------------------------------------------------------
# 12. EMPLOYEE SALES MONITORING & REPORTING (ADMIN DASHBOARD)
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def employee_sales_monitoring_report(request):
    """
    Employee Sales Monitoring & Reports for Admin Dashboard.
    Supports filters: today, yesterday, this_month, custom (start_date, end_date), employee_id.
    Shows daily/monthly sales, products sold, cash vs online collection per employee and store-wide.
    Provides detailed sales inspection.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role == 'EMPLOYEE' and req_emp and not req_emp.can_view_reports:
        return Response({
            'success': False,
            'message': 'Access restricted: Staff cannot view store-wide employee sales reports.'
        }, status=status.HTTP_403_FORBIDDEN)

    filter_type = request.GET.get('filter_type', 'today').lower()
    target_emp_id = request.GET.get('employee_id', '')

    today = timezone.localdate()
    this_month_start = today.replace(day=1)
    yesterday = today - timedelta(days=1)

    if filter_type == 'yesterday':
        filter_start = yesterday
        filter_end = yesterday
    elif filter_type == 'this_month':
        filter_start = this_month_start
        filter_end = today
    elif filter_type == 'custom':
        start_str = request.GET.get('start_date', '')
        end_str = request.GET.get('end_date', '')
        try:
            filter_start = datetime.strptime(start_str, '%Y-%m-%d').date() if start_str else today
        except ValueError:
            filter_start = today
        try:
            filter_end = datetime.strptime(end_str, '%Y-%m-%d').date() if end_str else today
        except ValueError:
            filter_end = today
    else:  # 'today'
        filter_type = 'today'
        filter_start = today
        filter_end = today

    all_employees = list(Employee.objects.select_related('user').all().order_by('name'))
    emp_user_ids = [e.user.id for e in all_employees if e.user]

    # Querysets (Excluding cancelled sales from active turnover)
    filtered_sales_qs = Sale.objects.filter(sale_date__date__gte=filter_start, sale_date__date__lte=filter_end, is_cancelled=False)
    today_sales_qs = Sale.objects.filter(sale_date__date=today, is_cancelled=False)
    month_sales_qs = Sale.objects.filter(sale_date__date__gte=this_month_start, sale_date__date__lte=today, is_cancelled=False)
    filtered_payments_qs = Payment.objects.filter(payment_date__date__gte=filter_start, payment_date__date__lte=filter_end, sale__is_cancelled=False)

    if target_emp_id:
        target_emp = Employee.objects.filter(id=target_emp_id).first()
        if target_emp and target_emp.user:
            filtered_sales_qs = filtered_sales_qs.filter(sales_rep=target_emp.user)
            filtered_payments_qs = filtered_payments_qs.filter(Q(received_by=target_emp.user) | Q(sale__sales_rep=target_emp.user))

    employee_reports = []

    # Owner / Direct Store Counter sales (sales without staff or sales_rep not in registered employees)
    owner_filtered_sales = Sale.objects.filter(
        Q(sales_rep__isnull=True) | ~Q(sales_rep__id__in=emp_user_ids),
        sale_date__date__gte=filter_start,
        sale_date__date__lte=filter_end,
        is_cancelled=False
    )
    o_today_sales = float(today_sales_qs.filter(Q(sales_rep__isnull=True) | ~Q(sales_rep__id__in=emp_user_ids)).aggregate(s=Sum('grand_total'))['s'] or 0)
    o_month_sales = float(month_sales_qs.filter(Q(sales_rep__isnull=True) | ~Q(sales_rep__id__in=emp_user_ids)).aggregate(s=Sum('grand_total'))['s'] or 0)
    o_turnover = float(owner_filtered_sales.aggregate(s=Sum('grand_total'))['s'] or 0)
    o_bills = owner_filtered_sales.count()
    o_products = int(SaleItem.objects.filter(sale__in=owner_filtered_sales).aggregate(q=Sum('quantity'))['q'] or 0)

    o_payments = Payment.objects.filter(
        sale__in=owner_filtered_sales,
        payment_date__date__gte=filter_start,
        payment_date__date__lte=filter_end
    )
    o_cash = float(o_payments.filter(payment_mode='CASH').aggregate(s=Sum('amount'))['s'] or 0)
    o_online = float(o_payments.filter(payment_mode__in=['UPI', 'ONLINE', 'BANK_TRANSFER']).aggregate(s=Sum('amount'))['s'] or 0)

    if not target_emp_id or target_emp_id == '0':
        employee_reports.append({
            'employee_id': 0,
            'employee_code': 'OWNER',
            'employee_name': 'Shop Owner (Direct Counter)',
            'phone': 'Showroom',
            'designation': 'Proprietor',
            'is_active': True,
            'has_login': True,
            'today_sales': o_today_sales,
            'monthly_sales': o_month_sales,
            'filtered_sales': o_turnover,
            'bills_count': o_bills,
            'total_products_sold': o_products,
            'cash_collection': o_cash,
            'online_collection': o_online,
            'total_collection': o_cash + o_online
        })

    # Each Employee
    for emp in all_employees:
        if target_emp_id and str(emp.id) != str(target_emp_id):
            continue

        emp_user = emp.user
        if emp_user:
            e_today_sales = float(today_sales_qs.filter(sales_rep=emp_user).aggregate(s=Sum('grand_total'))['s'] or 0)
            e_month_sales = float(month_sales_qs.filter(sales_rep=emp_user).aggregate(s=Sum('grand_total'))['s'] or 0)
            
            e_filtered_sales = Sale.objects.filter(sales_rep=emp_user, sale_date__date__gte=filter_start, sale_date__date__lte=filter_end, is_cancelled=False)
            e_filtered_turnover = float(e_filtered_sales.aggregate(s=Sum('grand_total'))['s'] or 0)
            e_bills_count = e_filtered_sales.count()

            e_products_sold = int(SaleItem.objects.filter(sale__in=e_filtered_sales).aggregate(q=Sum('quantity'))['q'] or 0)

            e_payments = Payment.objects.filter(
                Q(sale__sales_rep=emp_user) | Q(received_by=emp_user),
                payment_date__date__gte=filter_start,
                payment_date__date__lte=filter_end,
                sale__is_cancelled=False
            )
            e_cash = float(e_payments.filter(payment_mode='CASH').aggregate(s=Sum('amount'))['s'] or 0)
            e_online = float(e_payments.filter(payment_mode__in=['UPI', 'ONLINE', 'BANK_TRANSFER']).aggregate(s=Sum('amount'))['s'] or 0)
            e_total_coll = e_cash + e_online
        else:
            e_today_sales = 0.0
            e_month_sales = 0.0
            e_filtered_turnover = 0.0
            e_bills_count = 0
            e_products_sold = 0
            e_cash = 0.0
            e_online = 0.0
            e_total_coll = 0.0

        employee_reports.append({
            'employee_id': emp.id,
            'employee_code': emp.employee_code,
            'employee_name': emp.name,
            'phone': emp.phone,
            'designation': emp.designation,
            'is_active': emp.is_active,
            'has_login': bool(emp.user),
            'today_sales': e_today_sales,
            'monthly_sales': e_month_sales,
            'filtered_sales': e_filtered_turnover,
            'bills_count': e_bills_count,
            'total_products_sold': e_products_sold,
            'cash_collection': e_cash,
            'online_collection': e_online,
            'total_collection': e_total_coll
        })

    # Combined Staff Totals (All Staff Members Combined)
    staff_reports = [r for r in employee_reports if r['employee_id'] != 0]
    combined_staff_totals = {
        'total_bills': sum(r['bills_count'] for r in staff_reports),
        'total_sales': sum(r['filtered_sales'] for r in staff_reports),
        'total_products_sold': sum(r['total_products_sold'] for r in staff_reports),
        'cash_collection': sum(r['cash_collection'] for r in staff_reports),
        'online_collection': sum(r['online_collection'] for r in staff_reports),
        'total_collection': sum(r['total_collection'] for r in staff_reports)
    }

    # Store Grand Totals (Including direct owner counter if any)
    tot_sales_amt = float(filtered_sales_qs.aggregate(s=Sum('grand_total'))['s'] or 0)
    tot_bills = filtered_sales_qs.count()
    tot_products = int(SaleItem.objects.filter(sale__in=filtered_sales_qs).aggregate(q=Sum('quantity'))['q'] or 0)
    tot_cash = float(filtered_payments_qs.filter(payment_mode='CASH').aggregate(s=Sum('amount'))['s'] or 0)
    tot_online = float(filtered_payments_qs.filter(payment_mode__in=['UPI', 'ONLINE', 'BANK_TRANSFER']).aggregate(s=Sum('amount'))['s'] or 0)

    # Detailed sales inspection list (all sales in period)
    inspection_sales_qs = Sale.objects.filter(sale_date__date__gte=filter_start, sale_date__date__lte=filter_end)
    if target_emp_id:
        target_emp = Employee.objects.filter(id=target_emp_id).first()
        if target_emp and target_emp.user:
            inspection_sales_qs = inspection_sales_qs.filter(sales_rep=target_emp.user)

    detailed_sales = []
    for s in inspection_sales_qs.select_related('customer', 'sales_rep').prefetch_related('items__product', 'payments').order_by('-sale_date')[:100]:
        sale_cash = float(s.payments.filter(payment_mode='CASH').aggregate(s=Sum('amount'))['s'] or 0)
        sale_online = float(s.payments.filter(payment_mode__in=['UPI', 'ONLINE', 'BANK_TRANSFER']).aggregate(s=Sum('amount'))['s'] or 0)
        
        rep_emp = getattr(s.sales_rep, 'employee_record', None) if s.sales_rep else None
        rep_name = rep_emp.name if rep_emp else (s.sales_rep.username if s.sales_rep else 'Store Owner')
        rep_code = rep_emp.employee_code if rep_emp else 'OWNER'

        items_breakdown = []
        for itm in s.items.all():
            items_breakdown.append({
                'product_name': itm.product.product_name,
                'product_code': itm.product.product_code,
                'category_name': itm.product.category.name if hasattr(itm.product, 'category') and itm.product.category else 'General',
                'quantity': itm.quantity,
                'unit_selling_price': float(itm.unit_selling_price),
                'total_price': float(itm.total_price),
            })

        detailed_sales.append({
            'id': s.id,
            'invoice_number': s.invoice_number,
            'invoice_type': s.invoice_type,
            'employee_name': rep_name,
            'employee_code': rep_code,
            'customer_name': s.customer.name,
            'customer_phone': s.customer.phone,
            'sale_date': timezone.localtime(s.sale_date).strftime('%d %b %Y, %I:%M %p'),
            'products': items_breakdown,
            'total_products_count': sum(i['quantity'] for i in items_breakdown),
            'grand_total': float(s.grand_total),
            'amount_paid': float(s.amount_paid),
            'cash_received': sale_cash,
            'online_received': sale_online,
            'balance_amount': float(s.balance_amount),
            'payment_type': s.payment_type,
            'is_emi_sale': s.is_emi_sale,
            'is_cancelled': s.is_cancelled,
            'cancellation_reason': s.cancellation_reason,
            'cancelled_at': timezone.localtime(s.cancelled_at).strftime('%d %b %Y, %I:%M %p') if s.cancelled_at else None
        })

    return Response({
        'success': True,
        'filter': {
            'filter_type': filter_type,
            'start_date': str(filter_start),
            'end_date': str(filter_end),
            'employee_id': target_emp_id
        },
        'combined_staff_totals': combined_staff_totals,
        'grand_totals': {
            'total_sales': tot_sales_amt,
            'total_bills': tot_bills,
            'total_products_sold': tot_products,
            'cash_collection': tot_cash,
            'online_collection': tot_online,
            'total_collection': tot_cash + tot_online
        },
        'employee_reports': employee_reports,
        'sales_inspection': detailed_sales
    })

# -----------------------------------------------------------------------------
# 13. SALARY & ADVANCE MANAGEMENT (ADMIN ONLY)
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def salary_list_create(request):
    """
    Salary & Advance Management for Shop Owner.
    GET: Returns current month balances per employee + payment history.
    POST: Records monthly salary payment or advance payment.
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role == 'EMPLOYEE':
        return Response({'success': False, 'message': 'Access denied: Salary management is restricted to Store Owner.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        records = SalaryRecord.objects.select_related('employee', 'recorded_by').all().order_by('-payment_date', '-created_at')
        
        emp_id = request.GET.get('employee_id')
        if emp_id:
            records = records.filter(employee_id=emp_id)

        month_filter = request.GET.get('month')
        if month_filter:
            records = records.filter(month=month_filter)

        current_month_str = timezone.localdate().strftime('%B %Y')
        employees = Employee.objects.all().order_by('name')
        emp_summaries = []

        for emp in employees:
            monthly_sal = float(emp.base_salary)
            adv_records = SalaryRecord.objects.filter(employee=emp, month=current_month_str, record_type='ADVANCE')
            tot_advance = float(adv_records.aggregate(s=Sum('amount_paid'))['s'] or 0)
            
            sal_records = SalaryRecord.objects.filter(employee=emp, month=current_month_str, record_type='SALARY')
            tot_paid = float(sal_records.aggregate(s=Sum('amount_paid'))['s'] or 0)

            remaining = max(0.0, monthly_sal - tot_advance - tot_paid)
            status_val = 'PAID' if remaining <= 0 and (tot_paid > 0 or tot_advance >= monthly_sal) else ('PARTIAL' if (tot_paid + tot_advance) > 0 else 'PENDING')

            emp_summaries.append({
                'employee_id': emp.id,
                'employee_name': emp.name,
                'employee_code': emp.employee_code,
                'designation': emp.designation,
                'phone': emp.phone,
                'monthly_salary': monthly_sal,
                'advance_taken': tot_advance,
                'salary_paid': tot_paid,
                'remaining_salary': remaining,
                'status': status_val,
                'current_month': current_month_str,
                'is_active': emp.is_active
            })

        return Response({
            'success': True,
            'current_month': current_month_str,
            'employee_summaries': emp_summaries,
            'count': records.count(),
            'records': SalaryRecordSerializer(records[:100], many=True).data
        })

    elif request.method == 'POST':
        data = request.data
        emp_id = data.get('employee_id')
        if not emp_id:
            return Response({'success': False, 'message': 'Employee ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        emp = Employee.objects.filter(pk=emp_id).first()
        if not emp:
            return Response({'success': False, 'message': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        month = data.get('month', timezone.localdate().strftime('%B %Y'))
        rec_type = data.get('record_type', 'SALARY').upper() # 'SALARY' or 'ADVANCE'
        monthly_sal = Decimal(str(data.get('monthly_salary', emp.base_salary)))
        amount_paid = Decimal(str(data.get('amount_paid', 0)))
        advance_deducted = Decimal(str(data.get('advance_amount', 0)))
        
        if rec_type == 'ADVANCE':
            remaining = max(Decimal('0.00'), monthly_sal - amount_paid)
            rec_status = 'PARTIAL' if remaining > Decimal('0.00') else 'PAID'
        else:
            remaining = max(Decimal('0.00'), monthly_sal - advance_deducted - amount_paid)
            rec_status = 'PAID' if remaining <= Decimal('0.00') else ('PARTIAL' if amount_paid > 0 else 'PENDING')

        pay_date = data.get('payment_date', timezone.localdate())
        pay_mode = data.get('payment_mode', 'CASH').upper()
        notes = data.get('notes', '')

        with transaction.atomic():
            sal_rec = SalaryRecord.objects.create(
                employee=emp,
                month=month,
                monthly_salary=monthly_sal,
                advance_amount=advance_deducted if rec_type == 'SALARY' else amount_paid,
                amount_paid=amount_paid,
                remaining_salary=remaining,
                payment_date=pay_date,
                status=rec_status,
                payment_mode=pay_mode,
                record_type=rec_type,
                notes=notes,
                recorded_by=req_user
            )

            # Record Expense automatically for shop accounting
            if amount_paid > Decimal('0.00'):
                exp_cat = 'STAFF_ADVANCE' if rec_type == 'ADVANCE' else 'MISCELLANEOUS'
                Expense.objects.create(
                    expense_code=f"EXP-SAL-{uuid.uuid4().hex[:6].upper()}",
                    category=exp_cat,
                    amount=amount_paid,
                    expense_date=pay_date,
                    payment_mode=pay_mode,
                    paid_to=emp.name,
                    description=f"{rec_type} payment for {emp.name} ({month}). Mode: {pay_mode}",
                    recorded_by=req_user
                )

        return Response({
            'success': True,
            'message': f"₹{amount_paid} {rec_type.lower()} payment for {emp.name} recorded successfully.",
            'data': SalaryRecordSerializer(sal_rec).data
        }, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def salary_detail(request, pk):
    try:
        rec = SalaryRecord.objects.select_related('employee').get(pk=pk)
    except SalaryRecord.DoesNotExist:
        return Response({'success': False, 'message': 'Salary record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'data': SalaryRecordSerializer(rec).data})

    elif request.method == 'PUT':
        data = request.data
        if 'amount_paid' in data: rec.amount_paid = Decimal(str(data['amount_paid']))
        if 'advance_amount' in data: rec.advance_amount = Decimal(str(data['advance_amount']))
        if 'remaining_salary' in data: rec.remaining_salary = Decimal(str(data['remaining_salary']))
        if 'payment_date' in data and data['payment_date']: rec.payment_date = data['payment_date']
        if 'payment_mode' in data: rec.payment_mode = data['payment_mode']
        if 'status' in data: rec.status = data['status']
        if 'notes' in data: rec.notes = data['notes']
        rec.save()
        return Response({'success': True, 'message': 'Salary record updated.', 'data': SalaryRecordSerializer(rec).data})

    elif request.method == 'DELETE':
        rec.delete()
        return Response({'success': True, 'message': 'Salary record deleted.'})

# -----------------------------------------------------------------------------
# 14. ADMIN ATTENDANCE MANAGEMENT
# -----------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_mark_attendance(request):
    """
    Admin Attendance Management:
    Allows Admin to mark or edit attendance for any employee on any date.
    Statuses: PRESENT, ABSENT, HALF_DAY, LEAVE
    """
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    data = request.data
    emp_id = data.get('employee_id')
    att_date = data.get('date', timezone.localdate())
    status_val = data.get('status', 'PRESENT').upper()
    notes = data.get('notes', '')
    hours = data.get('working_hours')

    if not emp_id:
        return Response({'success': False, 'message': 'Employee ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        emp = Employee.objects.get(pk=emp_id)
    except Employee.DoesNotExist:
        return Response({'success': False, 'message': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

    if hours is None or hours == '':
        if status_val == 'PRESENT':
            hours = Decimal('8.00')
        elif status_val == 'HALF_DAY':
            hours = Decimal('4.00')
        else:
            hours = Decimal('0.00')
    else:
        hours = Decimal(str(hours))

    att, created = Attendance.objects.update_or_create(
        employee=emp,
        date=att_date,
        defaults={
            'status': status_val,
            'working_hours': hours,
            'notes': notes
        }
    )

    action_word = "recorded" if created else "updated"
    return Response({
        'success': True,
        'message': f"Attendance for {emp.name} on {att_date} {action_word} as {status_val}.",
        'data': AttendanceSerializer(att).data
    })

# -----------------------------------------------------------------------------
# 15. ADMIN CLEAR & DELETE ENDPOINTS (FRESH RE-ENTRY)
# -----------------------------------------------------------------------------
@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_all_products(request):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Owner only.'}, status=status.HTTP_403_FORBIDDEN)
    with transaction.atomic():
        StockMovement.objects.all().delete()
        DailyStockRecord.objects.all().delete()
        Product.objects.all().delete()
    return Response({'success': True, 'message': 'All inventory products deleted.'})

@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_all_customers(request):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Owner only.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        with transaction.atomic():
            EmiInstallment.objects.all().delete()
            EmiAccount.objects.all().delete()
            Payment.objects.all().delete()
            SaleItem.objects.all().delete()
            Sale.objects.all().delete()
            Customer.objects.all().delete()
        return Response({'success': True, 'message': 'All customer records and historical transactions cleared.'})
    except Exception as e:
        return Response({'success': False, 'message': f"Error clearing customers: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_all_sales(request):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Owner only.'}, status=status.HTTP_403_FORBIDDEN)
    with transaction.atomic():
        EmiInstallment.objects.all().delete()
        EmiAccount.objects.all().delete()
        Payment.objects.all().delete()
        SaleItem.objects.all().delete()
        Sale.objects.all().delete()
        Customer.objects.all().update(total_spent=Decimal('0.00'), total_outstanding=Decimal('0.00'))
    return Response({'success': True, 'message': 'All sales, invoices and customer ledger dues cleared.'})

@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_all_emi(request):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Owner only.'}, status=status.HTTP_403_FORBIDDEN)
    with transaction.atomic():
        EmiInstallment.objects.all().delete()
        EmiAccount.objects.all().delete()
    return Response({'success': True, 'message': 'All EMI accounts deleted.'})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def emi_account_detail(request, pk):
    req_user, req_emp, req_role = get_request_user_and_employee(request)
    if request.method in ['PUT', 'DELETE'] and req_role != 'OWNER':
        return Response({'success': False, 'message': 'Access Denied: Only Showroom Owner (Admin) can edit or delete EMI accounts. Once EMI is created, staff cannot adjust it.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        acc = EmiAccount.objects.select_related('customer', 'sale').prefetch_related('installments').get(pk=pk)
    except EmiAccount.DoesNotExist:
        return Response({'success': False, 'message': 'EMI Account not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({'success': True, 'data': EmiAccountSerializer(acc).data})

    elif request.method == 'PUT':
        data = request.data
        with transaction.atomic():
            if acc.customer:
                if 'customer_name' in data and data['customer_name']:
                    acc.customer.name = data['customer_name'].strip()
                if 'customer_phone' in data and data['customer_phone']:
                    acc.customer.phone = data['customer_phone'].strip()
                acc.customer.save()

            if 'total_amount' in data:
                acc.total_amount = Decimal(str(data['total_amount']))
            if 'down_payment' in data:
                acc.down_payment = Decimal(str(data['down_payment']))
            if 'paid_amount' in data:
                acc.paid_amount = Decimal(str(data['paid_amount']))
            if 'remaining_balance' in data:
                acc.remaining_balance = Decimal(str(data['remaining_balance']))
            elif 'total_amount' in data and 'down_payment' in data:
                acc.remaining_balance = max(Decimal('0.00'), acc.total_amount - acc.down_payment - acc.paid_amount)

            if 'monthly_installment' in data:
                acc.monthly_installment = Decimal(str(data['monthly_installment']))
            if 'total_months' in data:
                acc.total_months = int(data['total_months'])
            if 'due_day_of_month' in data:
                acc.due_day_of_month = int(data['due_day_of_month'])
            if 'status' in data:
                acc.status = data['status']
            if 'notes' in data:
                acc.notes = data['notes']

            acc.save()

        fresh_acc = EmiAccount.objects.select_related('customer', 'sale').prefetch_related('installments').get(pk=acc.pk)
        return Response({
            'success': True,
            'message': f"EMI Account {acc.emi_account_number} updated successfully.",
            'data': EmiAccountSerializer(fresh_acc).data,
            'account': EmiAccountSerializer(fresh_acc).data
        })

    elif request.method == 'DELETE':
        with transaction.atomic():
            acc.installments.all().delete()
            acc.delete()
        return Response({'success': True, 'message': 'EMI account deleted.'})

@api_view(['DELETE'])
@permission_classes([AllowAny])
def attendance_delete(request, pk):
    try:
        att = Attendance.objects.get(pk=pk)
        att.delete()
        return Response({'success': True, 'message': 'Attendance record deleted.'})
    except Attendance.DoesNotExist:
        return Response({'success': False, 'message': 'Record not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_all_attendance(request):
    Attendance.objects.all().delete()
    return Response({'success': True, 'message': 'All attendance records cleared.'})


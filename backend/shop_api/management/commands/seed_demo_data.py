import os
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from shop_api.models import (
    Role, UserProfile, Employee, Attendance, Category, Supplier,
    Product, StockMovement, Customer, Purchase, PurchaseItem,
    Sale, SaleItem, Payment, EmiAccount, EmiInstallment, Expense, AuditLog
)

class Command(BaseCommand):
    help = 'Seeds Shahin Steel Furniture database with master showroom data'

    def handle(self, *args, **options):
        self.stdout.write("🌱 Seeding Shahin Steel Furniture database...")

        # 1. Roles
        owner_role, _ = Role.objects.get_or_create(
            name='OWNER',
            defaults={
                'display_name': 'Store Owner / Admin',
                'description': 'Full access to all modules, financial reports, permissions and stock.',
                'can_manage_sales': True, 'can_manage_stock': True, 'can_manage_purchases': True,
                'can_manage_customers': True, 'can_manage_emi': True, 'can_manage_employees': True,
                'can_view_profit_loss': True, 'can_manage_expenses': True, 'can_view_reports': True,
                'can_manage_settings': True
            }
        )

        emp_role, _ = Role.objects.get_or_create(
            name='EMPLOYEE',
            defaults={
                'display_name': 'Sales Staff',
                'description': 'Sales counter operations, customer management, basic stock viewing and bill creation.',
                'can_manage_sales': True, 'can_manage_stock': False, 'can_manage_purchases': False,
                'can_manage_customers': True, 'can_manage_emi': True, 'can_manage_employees': False,
                'can_view_profit_loss': False, 'can_manage_expenses': False, 'can_view_reports': False,
                'can_manage_settings': False
            }
        )

        acc_role, _ = Role.objects.get_or_create(
            name='ACCOUNTANT',
            defaults={
                'display_name': 'Showroom Accountant',
                'description': 'Financial records, sales verification, purchases, expenses, and P&L analytics.',
                'can_manage_sales': True, 'can_manage_stock': True, 'can_manage_purchases': True,
                'can_manage_customers': True, 'can_manage_emi': True, 'can_manage_employees': False,
                'can_view_profit_loss': True, 'can_manage_expenses': True, 'can_view_reports': True,
                'can_manage_settings': False
            }
        )

        # 2. Users
        def create_user(username, email, role, phone, password='admin123', is_super=False):
            user, created = User.objects.get_or_create(username=username, defaults={'email': email})
            if created:
                user.set_password(password)
                if is_super:
                    user.is_superuser = True
                    user.is_staff = True
                user.save()
            UserProfile.objects.get_or_create(user=user, defaults={'role': role, 'phone': phone})
            return user

        owner_user = create_user('shahin_industry', 'owner@shahinsteel.com', owner_role, '+91 98765 43210', password='shahin@2007', is_super=True)
        acc_user = create_user('accountant', 'accounts@shahinsteel.com', acc_role, '+91 98765 43211')
        staff_user = create_user('staff1', 'sales@shahinsteel.com', emp_role, '+91 98765 43212')

        # 3. Employees
        employees_data = [
            {'code': 'EMP-001', 'name': 'Shahin Steel', 'phone': '+91 98765 43210', 'role': 'Store Manager', 'sal': 35000, 'user': owner_user},
            {'code': 'EMP-002', 'name': 'Rahul Verma', 'phone': '+91 98765 43211', 'role': 'Senior Accountant', 'sal': 25000, 'user': acc_user},
            {'code': 'EMP-003', 'name': 'Amit Kumar', 'phone': '+91 98765 43212', 'role': 'Lead Sales Executive', 'sal': 18000, 'user': staff_user},
            {'code': 'EMP-004', 'name': 'Pooja Kumari', 'phone': '+91 98765 43213', 'role': 'Customer Billing Specialist', 'sal': 16000, 'user': None},
        ]
        for e in employees_data:
            Employee.objects.get_or_create(
                employee_code=e['code'],
                defaults={
                    'name': e['name'], 'phone': e['phone'], 'designation': e['role'],
                    'base_salary': Decimal(str(e['sal'])), 'user': e['user'], 'joining_date': date(2024, 1, 15)
                }
            )

        # 4. Categories (Three primary categories requested)
        cat_plastic, _ = Category.objects.get_or_create(name='Plastic Items', defaults={'code': 'CAT-PLS', 'description': 'Moulded plastic chairs, dining tables, stools and utility items'})
        cat_wooden, _ = Category.objects.get_or_create(name='Wooden Items', defaults={'code': 'CAT-WOD', 'description': 'Solid wood & engineered wood double beds, wardrobes, dressing tables, sofa sets'})
        cat_steel, _ = Category.objects.get_or_create(name='Steel Items', defaults={'code': 'CAT-STL', 'description': 'Heavy-duty steel almirahs, iron beds, office filing cabinets, lockers and racks'})

        # 5. Suppliers
        sup_factory, _ = Supplier.objects.get_or_create(
            supplier_code='SUP-001',
            defaults={'name': 'Shahin Steel Factory Unit-1', 'contact_person': 'Md. Shahin', 'phone': '+91 98765 00001', 'is_factory': True, 'address': 'Industrial Area, Tatisilwai, Ranchi'}
        )
        sup_nilkamal, _ = Supplier.objects.get_or_create(
            supplier_code='SUP-002',
            defaults={'name': 'Nilkamal Plastic Mouldings Ltd', 'contact_person': 'Deepak Sharma', 'phone': '+91 98765 00002', 'is_factory': False, 'address': 'Kokar Industrial Area, Ranchi'}
        )
        sup_timber, _ = Supplier.objects.get_or_create(
            supplier_code='SUP-003',
            defaults={'name': 'Greenply Wood & Timber Hub', 'contact_person': 'Sanjay Agarwala', 'phone': '+91 98765 00003', 'is_factory': False, 'address': 'Circular Road, Ranchi'}
        )

        # 6. Products Catalog
        products_data = [
            # Steel Items
            {'cat': cat_steel, 'sup': sup_factory, 'code': 'STL-ALM-001', 'name': 'Royal Steel Almirah 3-Door with Mirror', 'buy': 12500, 'sell': 18500, 'qty': 14, 'min': 4, 'desc': 'Heavy gauge cold-rolled steel almirah with secret locker and triple security lock'},
            {'cat': cat_steel, 'sup': sup_factory, 'code': 'STL-BED-002', 'name': 'Imperial Steel Queen Bed with Headrest', 'buy': 8200, 'sell': 12900, 'qty': 8, 'min': 3, 'desc': 'Durable powder-coated wrought iron queen bed frame with wooden decorative trim'},
            {'cat': cat_steel, 'sup': sup_factory, 'code': 'STL-OFF-003', 'name': 'Executive Steel Office Cabinet 4-Drawer', 'buy': 4500, 'sell': 7200, 'qty': 19, 'min': 5, 'desc': 'Heavy gauge central locking system filing cabinet for commercial offices'},
            {'cat': cat_steel, 'sup': sup_factory, 'code': 'STL-RCK-004', 'name': 'Heavy Duty Multi-Tier Steel Storage Rack', 'buy': 2800, 'sell': 4400, 'qty': 25, 'min': 6, 'desc': 'Modular slotted angle steel display rack for shops and godowns'},
            {'cat': cat_steel, 'sup': sup_factory, 'code': 'STL-LCK-005', 'name': 'Heavy Safe Vault Steel Locker (Double Key)', 'buy': 6500, 'sell': 10500, 'qty': 3, 'min': 4, 'desc': 'Fire retardant heavy steel security vault'},

            # Wooden Items
            {'cat': cat_wooden, 'sup': sup_timber, 'code': 'WOD-SOF-001', 'name': 'Luxury 5-Seater Teak Wood Sofa Set', 'buy': 22000, 'sell': 34500, 'qty': 6, 'min': 2, 'desc': 'Hand-carved premium teak wood sofa with high-density gold upholstery cushions'},
            {'cat': cat_wooden, 'sup': sup_timber, 'code': 'WOD-BED-002', 'name': 'King Size Teak Wood Bed with Box Storage', 'buy': 18500, 'sell': 28000, 'qty': 5, 'min': 2, 'desc': 'Solid Sheesham wood king size double bed with hydraulic box storage'},
            {'cat': cat_wooden, 'sup': sup_timber, 'code': 'WOD-DRS-003', 'name': 'Modern Wooden Dressing Table with LED Mirror', 'buy': 6200, 'sell': 9800, 'qty': 11, 'min': 4, 'desc': 'Engineered wood dressing unit with multi-tier cosmetic shelves and full mirror'},
            {'cat': cat_wooden, 'sup': sup_timber, 'code': 'WOD-DIN-004', 'name': '6-Seater Solid Wood Dining Table with Chairs', 'buy': 16000, 'sell': 24500, 'qty': 4, 'min': 2, 'desc': 'Contemporary solid Sheesham wood dining set with cushioned chairs'},

            # Plastic Items
            {'cat': cat_plastic, 'sup': sup_nilkamal, 'code': 'PLS-CHR-001', 'name': 'Nilkamal Premium Armchair (Pack of 4)', 'buy': 2400, 'sell': 3600, 'qty': 40, 'min': 10, 'desc': 'Heavy virgin polypropylene moulded dining and outdoor armchairs'},
            {'cat': cat_plastic, 'sup': sup_nilkamal, 'code': 'PLS-TBL-002', 'name': 'Modern Plastic Round Centre Table', 'buy': 950, 'sell': 1550, 'qty': 28, 'min': 8, 'desc': 'Weather-resistant lightweight centre coffee table with detachable legs'},
            {'cat': cat_plastic, 'sup': sup_nilkamal, 'code': 'PLS-STL-003', 'name': 'High Strength Plastic Step Stool', 'buy': 260, 'sell': 450, 'qty': 65, 'min': 15, 'desc': 'Anti-skid grip heavy duty home and showroom utility stool'},
        ]

        for p in products_data:
            prod, created = Product.objects.get_or_create(
                product_code=p['code'],
                defaults={
                    'category': p['cat'], 'supplier': p['sup'], 'product_name': p['name'],
                    'purchase_price': Decimal(str(p['buy'])), 'selling_price': Decimal(str(p['sell'])),
                    'available_quantity': p['qty'], 'minimum_stock': p['min'], 'description': p['desc']
                }
            )
            if created:
                StockMovement.objects.create(
                    product=prod, movement_type='OPENING', quantity_changed=p['qty'],
                    previous_quantity=0, new_quantity=p['qty'], reference_type='MANUAL',
                    reference_id='INITIAL_OPENING', notes='Initial Showroom Opening Stock'
                )

        # 7. Customers
        customers_data = [
            {'code': 'CUST-001', 'name': 'Mohammad Imran', 'phone': '9876511111', 'address': 'Main Road, Kadru, Ranchi', 'spent': 46500},
            {'code': 'CUST-002', 'name': 'Vikram Singh', 'phone': '9876522222', 'address': 'Harmu Housing Colony, Ranchi', 'spent': 34500},
            {'code': 'CUST-003', 'name': 'Sunita Devi', 'phone': '9876533333', 'address': 'Bariatu Road, Ranchi', 'spent': 18500},
            {'code': 'CUST-004', 'name': 'Alok Ranjan', 'phone': '9876544444', 'address': 'Lalpur Chowk, Ranchi', 'spent': 28000},
        ]
        created_customers = []
        for c in customers_data:
            cust, _ = Customer.objects.get_or_create(
                phone=c['phone'],
                defaults={'customer_code': c['code'], 'name': c['name'], 'address': c['address'], 'total_spent': Decimal(str(c['spent']))}
            )
            created_customers.append(cust)

        # 8. Sample Sales Invoices
        c1 = created_customers[0]
        p_almirah = Product.objects.get(product_code='STL-ALM-001')
        p_sofa = Product.objects.get(product_code='WOD-SOF-001')

        if not Sale.objects.filter(invoice_number='SSF-20261109-001').exists():
            # Sale 1: Fully Paid (Cash + UPI mixed payment)
            s1 = Sale.objects.create(
                invoice_number='SSF-20261109-001',
                customer=c1,
                subtotal=Decimal('34500.00'),
                discount_amount=Decimal('500.00'),
                taxable_amount=Decimal('34000.00'),
                cgst_amount=Decimal('3060.00'),
                sgst_amount=Decimal('3060.00'),
                grand_total=Decimal('40120.00'),
                total_cogs=Decimal('22000.00'),
                net_profit=Decimal('18120.00'),
                amount_paid=Decimal('40120.00'),
                balance_amount=Decimal('0.00'),
                payment_type='FULL_PAID',
                invoice_type='TAX_INVOICE'
            )
            SaleItem.objects.create(
                sale=s1, product=p_sofa, quantity=1, unit_purchase_price=Decimal('22000.00'),
                unit_selling_price=Decimal('34500.00'), discount_amount=Decimal('500.00'),
                total_price=Decimal('34000.00'), cogs_total=Decimal('22000.00'), item_profit=Decimal('12000.00')
            )
            # Mixed payment: Rs 20,120 Cash + Rs 20,000 UPI
            Payment.objects.create(payment_reference_no='PAY-MIX-001', sale=s1, customer=c1, amount=Decimal('20120.00'), payment_mode='CASH', notes='Showroom cash counter')
            Payment.objects.create(payment_reference_no='PAY-MIX-002', sale=s1, customer=c1, amount=Decimal('20000.00'), payment_mode='UPI', transaction_id='UPI98765432101', notes='GPay QR Scan')

        # Sale 2: Customer EMI Sale
        c2 = created_customers[1]
        if not Sale.objects.filter(invoice_number='SSF-20261109-002').exists():
            s2 = Sale.objects.create(
                invoice_number='SSF-20261109-002',
                customer=c2,
                subtotal=Decimal('18500.00'),
                discount_amount=Decimal('0.00'),
                taxable_amount=Decimal('18500.00'),
                cgst_amount=Decimal('1665.00'),
                sgst_amount=Decimal('1665.00'),
                grand_total=Decimal('21830.00'),
                total_cogs=Decimal('12500.00'),
                net_profit=Decimal('9330.00'),
                amount_paid=Decimal('5000.00'), # Down payment
                balance_amount=Decimal('16830.00'),
                payment_type='EMI',
                is_emi_sale=True,
                invoice_type='TAX_INVOICE'
            )
            SaleItem.objects.create(
                sale=s2, product=p_almirah, quantity=1, unit_purchase_price=Decimal('12500.00'),
                unit_selling_price=Decimal('18500.00'), total_price=Decimal('18500.00'),
                cogs_total=Decimal('12500.00'), item_profit=Decimal('6000.00')
            )
            Payment.objects.create(payment_reference_no='PAY-DOWN-002', sale=s2, customer=c2, amount=Decimal('5000.00'), payment_mode='UPI', transaction_id='UPI-DOWN-9921', notes='EMI Down Payment')

            emi2 = EmiAccount.objects.create(
                emi_account_number='EMI-2026-001',
                sale=s2,
                customer=c2,
                total_amount=Decimal('21830.00'),
                down_payment=Decimal('5000.00'),
                principal_amount=Decimal('16830.00'),
                total_emi_amount=Decimal('16830.00'),
                total_months=6,
                monthly_installment=Decimal('2805.00'),
                paid_amount=Decimal('2805.00'), # 1st installment paid
                remaining_balance=Decimal('14025.00'),
                status='ACTIVE',
                start_date=date(2026, 10, 5),
                due_day_of_month=5
            )

            # Installment 1: Paid
            EmiInstallment.objects.create(
                emi_account=emi2, installment_number=1, due_date=date(2026, 11, 5),
                installment_amount=Decimal('2805.00'), paid_amount=Decimal('2805.00'),
                paid_date=date(2026, 11, 4), status='PAID', payment_mode='UPI',
                receipt_number='REC-EMI-1001', transaction_ref='UPI-INST-1'
            )
            # Installment 2: Pending
            EmiInstallment.objects.create(
                emi_account=emi2, installment_number=2, due_date=date(2026, 12, 5),
                installment_amount=Decimal('2805.00'), status='PENDING'
            )
            # Installments 3 to 6
            for inst_no in range(3, 7):
                due_m = (12 + inst_no - 2 - 1) % 12 + 1
                due_y = 2026 + ((12 + inst_no - 2 - 1) // 12)
                EmiInstallment.objects.create(
                    emi_account=emi2, installment_number=inst_no,
                    due_date=date(due_y, due_m, 5), installment_amount=Decimal('2805.00'), status='PENDING'
                )

        # 9. Expenses
        expenses_data = [
            {'code': 'EXP-001', 'cat': 'SHOP_RENT', 'amt': 28000, 'mode': 'BANK_TRANSFER', 'to': 'Estate Landlord', 'desc': 'Showroom Monthly Rent'},
            {'code': 'EXP-002', 'cat': 'ELECTRICITY_BILL', 'amt': 4200, 'mode': 'UPI', 'to': 'JBVNL Ranchi', 'desc': 'Showroom Power & AC Utilities'},
            {'code': 'EXP-003', 'cat': 'FACTORY_TRANSPORT', 'amt': 3500, 'mode': 'CASH', 'to': 'Ranchi Freight Logistics', 'desc': 'Almirah consignment transport from Tatisilwai Factory'},
            {'code': 'EXP-004', 'cat': 'TEA_REFRESHMENT', 'amt': 850, 'mode': 'CASH', 'to': 'Sharma Tea Stall', 'desc': 'Daily customer & staff tea hospitality'},
        ]
        for exp in expenses_data:
            Expense.objects.get_or_create(
                expense_code=exp['code'],
                defaults={
                    'category': exp['cat'], 'amount': Decimal(str(exp['amt'])),
                    'expense_date': date.today() - timedelta(days=2),
                    'payment_mode': exp['mode'], 'paid_to': exp['to'], 'description': exp['desc']
                }
            )

        self.stdout.write(self.style.SUCCESS("✅ Successfully seeded Shahin Steel Furniture master database!"))


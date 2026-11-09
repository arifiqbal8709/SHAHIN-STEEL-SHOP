from django.urls import path
from . import views

urlpatterns = [
    # Auth & Multi-Device
    path('auth/login/', views.login_view, name='login'),
    path('auth/user/', views.current_user_view, name='current_user'),
    path('auth/staff-logins/', views.active_staff_logins, name='active_staff_logins'),
    path('sync-status/', views.sync_status, name='sync_status'),

    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),

    # Inventory / Stock
    path('products/', views.product_list_create, name='product_list_create'),
    path('products/delete-all/', views.clear_all_products, name='clear_all_products'),
    path('products/<int:pk>/', views.product_detail, name='product_detail'),
    path('products/<int:pk>/adjust/', views.adjust_stock, name='adjust_stock'),
    path('stock-movements/', views.stock_movements_history, name='stock_movements_history'),

    # Sales & Invoices
    path('sales/', views.sales_list_create, name='sales_list_create'),
    path('sales/delete-all/', views.clear_all_sales, name='clear_all_sales'),
    path('sales/<str:invoice_number>/', views.sale_detail, name='sale_detail'),
    path('sales/<str:invoice_number>/cancel/', views.cancel_sale, name='cancel_sale'),

    # EMI Management
    path('emi/', views.emi_account_list, name='emi_account_list'),
    path('emi/delete-all/', views.clear_all_emi, name='clear_all_emi'),
    path('emi/<int:pk>/', views.emi_account_detail, name='emi_account_detail'),
    path('emi/installments/<int:installment_id>/pay/', views.record_emi_payment, name='record_emi_payment'),

    # Purchases
    path('purchases/', views.purchase_list_create, name='purchase_list_create'),

    # Customers
    path('customers/', views.customer_list, name='customer_list'),
    path('customers/delete-all/', views.clear_all_customers, name='clear_all_customers'),
    path('customers/<int:pk>/', views.customer_detail, name='customer_detail'),

    # Profit & Loss
    path('profit-loss/', views.profit_loss_report, name='profit_loss_report'),

    # Expenses
    path('expenses/', views.expense_list_create, name='expense_list_create'),

    # Employees, Permissions & Sales Monitoring
    path('employees/', views.employee_list_create, name='employee_list_create'),
    path('employees/sales-report/', views.employee_sales_monitoring_report, name='employee_sales_monitoring_report'),
    path('staff/<int:pk>/', views.staff_detail_update, name='staff_detail_update'),
    path('staff/<int:pk>/permissions/', views.staff_permissions_update, name='staff_permissions_update'),
    path('staff/<int:pk>/reset-password/', views.staff_reset_password, name='staff_reset_password'),
    path('staff/<int:pk>/toggle-status/', views.staff_toggle_status, name='staff_toggle_status'),
    path('staff/dashboard-stats/', views.staff_dashboard_stats, name='staff_dashboard_stats'),
    path('staff/my-profile/', views.staff_my_profile, name='staff_my_profile'),

    # Salary & Advance Management (Admin)
    path('salaries/', views.salary_list_create, name='salary_list_create'),
    path('salaries/<int:pk>/', views.salary_detail, name='salary_detail'),

    # Attendance
    path('attendance/', views.record_attendance, name='record_attendance'),
    path('attendance/delete-all/', views.clear_all_attendance, name='clear_all_attendance'),
    path('attendance/<int:pk>/', views.attendance_delete, name='attendance_delete'),
    path('attendance/admin-mark/', views.admin_mark_attendance, name='admin_mark_attendance'),
    path('attendance/check-in/', views.staff_attendance_check_in, name='staff_attendance_check_in'),
    path('attendance/check-out/', views.staff_attendance_check_out, name='staff_attendance_check_out'),
    path('attendance/half-day/', views.staff_mark_half_day, name='staff_mark_half_day'),
    path('attendance/leave/', views.staff_mark_leave, name='staff_mark_leave'),
    path('attendance/history/', views.staff_attendance_history, name='staff_attendance_history'),

    # Cash Registers
    path('cash-registers/', views.cash_register_list_create, name='cash_register_list_create'),
    path('cash-registers/<int:pk>/close/', views.cash_register_close, name='cash_register_close'),
]


from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root_view(request):
    return JsonResponse({
        "status": "online",
        "service": "SHAHIN STEEL FURNITURE - Live API Server",
        "version": "2.0.0",
        "frontend": "https://shahin-steel-shop.vercel.app",
        "endpoints": {
            "products": "/api/products/",
            "sales": "/api/sales/",
            "purchases": "/api/purchases/",
            "suppliers": "/api/suppliers/",
            "customers": "/api/customers/",
            "dashboard_stats": "/api/dashboard/stats/",
            "admin": "/admin/"
        }
    })

urlpatterns = [
    path('', api_root_view, name='api_root'),
    path('api/', api_root_view, name='api_base'),
    path('admin/', admin.site.urls),
    path('api/', include('shop_api.urls')),
]

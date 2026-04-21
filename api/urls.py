from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/',     views.RegisterView.as_view(),    name='api_register'),
    path('auth/login/',        views.LoginView.as_view(),       name='api_login'),
    path('auth/logout/',       views.LogoutView.as_view(),      name='api_logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),     name='api_token_refresh'),

    # Categories
    path('categories/',        views.CategoryListView.as_view(), name='api_categories'),

    # Products
    path('products/',          views.ProductListView.as_view(),   name='api_products'),
    path('products/<slug:slug>/', views.ProductDetailView.as_view(), name='api_product_detail'),

    # Cart
    path('cart/',              views.CartView.as_view(),          name='api_cart'),
    path('cart/<int:item_id>/', views.CartItemUpdateView.as_view(), name='api_cart_item'),

    # Orders
    path('orders/',            views.OrderListView.as_view(),     name='api_orders'),
    path('orders/create/',     views.CreateOrderView.as_view(),   name='api_order_create'),
    path('orders/<str:order_number>/', views.OrderDetailView.as_view(), name='api_order_detail'),

    # Payments
    path('payments/verify/',   views.PaystackVerifyView.as_view(), name='api_payment_verify'),
]
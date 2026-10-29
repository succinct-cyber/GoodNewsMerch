from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/',        views.RegisterView.as_view(),        name='api_register'),
    path('auth/verify-email/',    views.VerifyEmailView.as_view(),     name='api_verify_email'),
    path('auth/login/',           views.LoginView.as_view(),           name='api_login'),
    path('auth/token/refresh/',   TokenRefreshView.as_view(),          name='api_token_refresh'),
    path('auth/google/',          views.GoogleAuthView.as_view(),      name='api_google_auth'),
    path('auth/me/',              views.MeView.as_view(),              name='api_me'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(),  name='api_forgot_password'),
    path('auth/reset-password/',  views.ResetPasswordView.as_view(),   name='api_reset_password'),

    # Store
    path('categories/',                    views.CategoryListView.as_view(),    name='api_categories'),
    path('products/',                      views.ProductListView.as_view(),     name='api_products'),
    path('products/<slug:slug>/',          views.ProductDetailView.as_view(),   name='api_product_detail'),
    path('products/<int:pk>/reviews/',     views.ProductReviewsView.as_view(),  name='api_reviews'),

    # Cart
    path('cart/',            views.CartView.as_view(),      name='api_cart'),
    path('cart/add/',        views.CartAddView.as_view(),   name='api_cart_add'),
    path('cart/update/',     views.CartUpdateView.as_view(),name='api_cart_update'),
    path('cart/remove/<int:item_id>/', views.CartRemoveView.as_view(), name='api_cart_remove'),
    path('cart/merge/',      views.CartMergeView.as_view(), name='api_cart_merge'),

    # Orders
    path('orders/place/',           views.PlaceOrderView.as_view(),        name='api_place_order'),
    path('orders/verify/flutterwave/', views.FlutterwaveVerifyView.as_view(), name='api_fw_verify'),
    path('orders/verify/paystack/',    views.PaystackVerifyView.as_view(),    name='api_ps_verify'),
    path('orders/',                 views.OrderListView.as_view(),         name='api_orders'),
    path('orders/complete/',        views.OrderCompleteView.as_view(),     name='api_order_complete'),
    path('orders/<str:order_number>/', views.OrderDetailView.as_view(),   name='api_order_detail'),

    # Dashboard
    path('dashboard/', views.DashboardView.as_view(), name='api_dashboard'),
]
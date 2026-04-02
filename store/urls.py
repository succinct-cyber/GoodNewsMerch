from django.urls import path
from . import views


urlpatterns = [
    path('', views.store, name='shop'),
    path('shop/', views.store, name='shop'),
    path('shop/<slug:category_slug>/', views.store, name='products_by_category'),
    path('shop/<slug:category_slug>/<slug:product_slug>/', views.product_detail, name='product_detail'),
    path('search/', views.search, name='search'),
]
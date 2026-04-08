from django.urls import path
from . import views

urlpatterns = [
    path('place_order/', views.place_order, name='place_order'),
    path('payment/<str:order_number>/', views.payment, name='payment'),
    path('payments/', views.payments, name='payments'),
    path('order_complete/', views.order_complete, name='order_complete'),
    path('guest-checkout/',     views.guest_checkout,     name='guest_checkout'),
    path('guest-place-order/',  views.guest_place_order,  name='guest_place_order'),
]
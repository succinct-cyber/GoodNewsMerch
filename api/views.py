from django.shortcuts import render

# Create your views here.
import json
import requests as http_requests

from django.conf import settings
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from store.models import Product, Variation
from category.models import Category
from cart.models import Cart, CartItem
from orders.models import Order, OrderProduct, Payment
from accounts.models import Account

from .serializers import (
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    CartItemSerializer, OrderSerializer, RegisterSerializer, LoginSerializer,
)


def get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


# ── Auth ──────────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user   = serializer.save()
            tokens = get_tokens(user)
            return Response({
                'message': 'Account created successfully.',
                'tokens':  tokens,
                'user': {
                    'id':         user.id,
                    'email':      user.email,
                    'first_name': user.first_name,
                    'last_name':  user.last_name,
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            from django.contrib.auth import authenticate
            user = authenticate(
                email    = serializer.validated_data['email'],
                password = serializer.validated_data['password'],
            )
            if user:
                tokens = get_tokens(user)
                return Response({
                    'tokens': tokens,
                    'user': {
                        'id':         user.id,
                        'email':      user.email,
                        'first_name': user.first_name,
                        'last_name':  user.last_name,
                    }
                })
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


# ── Categories ────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    queryset           = Category.objects.all()
    serializer_class   = CategorySerializer
    permission_classes = [AllowAny]


# ── Products ──────────────────────────────────────────────────

class ProductListView(generics.ListAPIView):
    serializer_class   = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs       = Product.objects.filter(is_available=True)
        category = self.request.query_params.get('category')
        keyword  = self.request.query_params.get('search')
        if category:
            qs = qs.filter(category__slug=category)
        if keyword:
            qs = qs.filter(product_name__icontains=keyword)
        return qs


class ProductDetailView(generics.RetrieveAPIView):
    queryset           = Product.objects.filter(is_available=True)
    serializer_class   = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field       = 'slug'


# ── Cart ──────────────────────────────────────────────────────

class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items       = CartItem.objects.filter(user=request.user, is_active=True)
        serializer  = CartItemSerializer(items, many=True)
        total       = sum(item.sub_total() for item in items)
        tax         = round(total * 0.02, 2)
        return Response({
            'items':       serializer.data,
            'total':       total,
            'tax':         tax,
            'grand_total': total + tax,
        })

    def post(self, request):
        product_id = request.data.get('product_id')
        variations = request.data.get('variations', [])  # list of variation IDs

        try:
            product = Product.objects.get(id=product_id, is_available=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=404)

        variation_objs = Variation.objects.filter(id__in=variations)

        # Check if same combo exists
        existing = None
        for item in CartItem.objects.filter(user=request.user, product=product):
            existing_vars = sorted(item.variations.values_list('id', flat=True))
            new_vars      = sorted(v.id for v in variation_objs)
            if existing_vars == new_vars:
                existing = item
                break

        if existing:
            existing.quantity += 1
            existing.save()
            return Response({'message': 'Quantity updated.', 'quantity': existing.quantity})

        new_item = CartItem.objects.create(
            product=product, user=request.user, quantity=1
        )
        if variation_objs:
            new_item.variations.set(variation_objs)
        new_item.save()
        return Response({'message': 'Item added to cart.'}, status=201)

    def delete(self, request):
        cart_item_id = request.data.get('cart_item_id')
        try:
            item = CartItem.objects.get(id=cart_item_id, user=request.user)
            item.delete()
            return Response({'message': 'Item removed.'})
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=404)


class CartItemUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        try:
            item     = CartItem.objects.get(id=item_id, user=request.user)
            quantity = request.data.get('quantity', 1)
            if int(quantity) < 1:
                item.delete()
                return Response({'message': 'Item removed.'})
            item.quantity = int(quantity)
            item.save()
            return Response({'message': 'Updated.', 'quantity': item.quantity})
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=404)


# ── Orders ────────────────────────────────────────────────────

class OrderListView(generics.ListAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user, is_ordered=True
        ).order_by('-created_at')


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [IsAuthenticated]
    lookup_field       = 'order_number'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart_items = CartItem.objects.filter(user=request.user, is_active=True)
        if not cart_items.exists():
            return Response({'error': 'Cart is empty.'}, status=400)

        total    = sum(item.sub_total() for item in cart_items)
        tax      = round(total * 0.02, 2)
        grand    = total + tax

        import datetime
        data = request.data
        order = Order.objects.create(
            user           = request.user,
            first_name     = data.get('first_name', ''),
            last_name      = data.get('last_name', ''),
            email          = data.get('email', request.user.email),
            phone          = data.get('phone', ''),
            address_line_1 = data.get('address_line_1', ''),
            address_line_2 = data.get('address_line_2', ''),
            city           = data.get('city', ''),
            state          = data.get('state', ''),
            country        = data.get('country', 'Nigeria'),
            order_note     = data.get('order_note', ''),
            order_total    = grand,
            tax            = tax,
            ip             = request.META.get('REMOTE_ADDR'),
        )
        date             = datetime.date.today().strftime('%Y%m%d')
        order.order_number = date + str(order.id)
        order.save()

        return Response({
            'order_number': order.order_number,
            'grand_total':  grand,
            'message':      'Order created. Proceed to payment.',
        }, status=201)


# ── Payments ──────────────────────────────────────────────────

class PaystackVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_number = request.data.get('orderID')
        reference    = request.data.get('transID')

        try:
            order = Order.objects.get(
                user=request.user,
                is_ordered=False,
                order_number=order_number,
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        headers  = {'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'}
        url      = f'https://api.paystack.co/transaction/verify/{reference}'
        response = http_requests.get(url, headers=headers)
        result   = response.json()

        if result['data']['status'] == 'success':
            payment = Payment.objects.create(
                user           = request.user,
                payment_id     = reference,
                payment_method = 'Paystack',
                amount_paid    = result['data']['amount'] / 100,
                status         = 'success',
            )
            order.payment    = payment
            order.is_ordered = True
            order.status     = 'Completed'
            order.save()

            cart_items = CartItem.objects.filter(user=request.user)
            for item in cart_items:
                op = OrderProduct.objects.create(
                    order         = order,
                    payment       = payment,
                    user          = request.user,
                    product       = item.product,
                    quantity      = item.quantity,
                    product_price = item.product.price,
                    ordered       = True,
                )
                op.variations.set(item.variations.all())
                item.product.stock -= item.quantity
                item.product.save()
            cart_items.delete()

            return Response({
                'status':       'success',
                'order_number': order.order_number,
                'payment_id':   payment.payment_id,
            })

        return Response({'status': 'failed'}, status=400)
import json
import datetime
import requests as http_requests

from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from accounts.models import Account, UserProfile
from store.models import Product, Variation, ReviewRating
from category.models import Category
from cart.models import Cart, CartItem
from orders.models import Order, OrderProduct, Payment

from .serializers import (
    RegisterSerializer, UserSerializer, UserProfileSerializer,
    CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    ReviewSerializer, CartItemSerializer, OrderSerializer,
)


def _get_tokens(user):
    """Return JWT access + refresh for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access' : str(refresh.access_token),
    }


# ── Register ─────────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        # Send verification email
        try:
            current_site = get_current_site(request)
            mail_subject = 'Please activate your GoodNews Merch account'
            message = render_to_string('accounts/account_verification_email.html', {
                'user'  : user,
                'domain': current_site.domain,
                'uid'   : urlsafe_base64_encode(force_bytes(user.pk)),
                'token' : default_token_generator.make_token(user),
            })
            email = EmailMessage(mail_subject, message, to=[user.email])
            email.content_subtype = 'html'
            email.send()
        except Exception as e:
            print('Verification email failed:', e)

        return Response(
            {'message': f'Account created. Check {user.email} for a verification link.'},
            status=status.HTTP_201_CREATED,
        )


# ── Email Verification ────────────────────────────────────────

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid   = request.data.get('uid')
        token = request.data.get('token')
        try:
            from django.utils.http import urlsafe_base64_decode
            pk   = urlsafe_base64_decode(uid).decode()
            user = Account.objects.get(pk=pk)
        except Exception:
            return Response({'error': 'Invalid link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Link expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save()
        return Response({'message': 'Account verified. You can now log in.'})


# ── Login ─────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate
        email    = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        user     = authenticate(request, email=email, password=password)

        if user is None:
            return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({'error': 'Please verify your email first.'}, status=status.HTTP_403_FORBIDDEN)

        return Response({**_get_tokens(user), 'user': UserSerializer(user).data})


# ── Google OAuth ──────────────────────────────────────────────

class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({'error': 'Token required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            info = id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
        except ValueError:
            return Response({'error': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

        email      = info['email']
        first_name = info.get('given_name', '')
        last_name  = info.get('family_name', '')

        user, created = Account.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name' : last_name,
                'username'  : email.split('@')[0],
                'is_active' : True,
            }
        )
        if created:
            UserProfile.objects.get_or_create(user=user)
            user.set_unusable_password()
            user.save()

        return Response({**_get_tokens(user), 'user': UserSerializer(user).data})


# ── Current User ──────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.get_or_create(user=request.user)[0]
        return Response({
            'user'   : UserSerializer(request.user).data,
            'profile': UserProfileSerializer(profile).data,
        })

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
        profile = UserProfile.objects.get_or_create(user=request.user)[0]
        profile_data = {k: v for k, v in request.data.items()
                        if k in ['address_line_1', 'address_line_2', 'city', 'state', 'country']}
        if profile_data:
            for k, v in profile_data.items():
                setattr(profile, k, v)
            profile.save()
        return Response(UserSerializer(request.user).data)


# ── Password ──────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user = Account.objects.get(email=email, is_active=True)
            message = render_to_string('accounts/reset_password_email.html', {
                'user' : user,
                'uid'  : urlsafe_base64_encode(force_bytes(user.pk)),
                'token': default_token_generator.make_token(user),
            })
            EmailMessage('Reset your GoodNews Merch password', message, to=[email]).send()
        except Account.DoesNotExist:
            pass  # Don't reveal whether email exists
        return Response({'message': 'If that email exists, a reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid      = request.data.get('uid')
        token    = request.data.get('token')
        password = request.data.get('password')
        try:
            pk   = urlsafe_base64_decode(uid).decode()
            user = Account.objects.get(pk=pk)
        except Exception:
            return Response({'error': 'Invalid link.'}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Link expired.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        return Response({'message': 'Password reset successful.'})

# ── Categories ────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    queryset           = Category.objects.all()
    serializer_class   = CategorySerializer
    permission_classes = [permissions.AllowAny]


# ── Products ──────────────────────────────────────────────────

class ProductListView(generics.ListAPIView):
    serializer_class   = ProductListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs       = Product.objects.filter(is_available=True).select_related('category')
        category = self.request.query_params.get('category')
        search   = self.request.query_params.get('search')
        if category:
            qs = qs.filter(category__slug=category)
        if search:
            qs = qs.filter(product_name__icontains=search)
        return qs


class ProductDetailView(generics.RetrieveAPIView):
    serializer_class   = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field       = 'slug'
    queryset           = Product.objects.filter(is_available=True)


class ProductReviewsView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        reviews = ReviewRating.objects.filter(product_id=pk, status=True)
        return Response(ReviewSerializer(reviews, many=True).data)

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Gate: must have purchased
        has_ordered = OrderProduct.objects.filter(
            user=request.user, product=product, ordered=True
        ).exists()
        if not has_ordered:
            return Response(
                {'error': 'You must purchase this product before reviewing.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Update or create
        review, _ = ReviewRating.objects.update_or_create(
            product=product, user=request.user,
            defaults={
                'subject': request.data.get('subject', ''),
                'review' : request.data.get('review', ''),
                'rating' : request.data.get('rating', 0),
                'ip'     : request.META.get('REMOTE_ADDR'),
                'status' : True,
            }
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


# ── Cart ──────────────────────────────────────────────────────
# Guest cart uses session key passed as X-Cart-ID header.
# Auth cart is stored against the user FK — session ID irrelevant.

def _get_cart_items(request):
    """Return queryset of active cart items for the current visitor."""
    if request.user.is_authenticated:
        return CartItem.objects.filter(user=request.user, active=True).select_related('product')
    cart_id = request.headers.get('X-Cart-ID')
    if not cart_id:
        return CartItem.objects.none()
    try:
        cart = Cart.objects.get(cart_id=cart_id)
        return CartItem.objects.filter(cart=cart, active=True).select_related('product')
    except Cart.DoesNotExist:
        return CartItem.objects.none()


class CartView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        items = _get_cart_items(request)
        return Response(CartItemSerializer(items, many=True).data)


class CartAddView(APIView):
    """
    POST body: { product_id, quantity, variations: [variation_id, ...] }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        product_id    = request.data.get('product_id')
        quantity      = int(request.data.get('quantity', 1))
        variation_ids = request.data.get('variations', [])

        try:
            product = Product.objects.get(pk=product_id, is_available=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        variations = list(Variation.objects.filter(id__in=variation_ids))
        sorted_ids = sorted(v.id for v in variations)

        if request.user.is_authenticated:
            # Look for existing item with exact same variation combo
            for item in CartItem.objects.filter(user=request.user, product=product, active=True):
                if sorted(item.variations.values_list('id', flat=True)) == sorted_ids:
                    item.quantity += quantity
                    item.save()
                    return Response(CartItemSerializer(item).data)
            # Not found — create
            item = CartItem.objects.create(user=request.user, product=product, quantity=quantity)
            item.variations.set(variations)
            return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)

        else:
            cart_id = request.headers.get('X-Cart-ID') or request.data.get('cart_id')
            if not cart_id:
                return Response({'error': 'X-Cart-ID header required for guest.'}, status=400)
            cart, _ = Cart.objects.get_or_create(cart_id=cart_id)
            for item in CartItem.objects.filter(cart=cart, product=product, active=True):
                if sorted(item.variations.values_list('id', flat=True)) == sorted_ids:
                    item.quantity += quantity
                    item.save()
                    return Response(CartItemSerializer(item).data)
            item = CartItem.objects.create(cart=cart, product=product, quantity=quantity)
            item.variations.set(variations)
            return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED)


class CartUpdateView(APIView):
    """PATCH body: { item_id, quantity }"""
    permission_classes = [permissions.AllowAny]

    def patch(self, request):
        item_id  = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        try:
            if request.user.is_authenticated:
                item = CartItem.objects.get(pk=item_id, user=request.user)
            else:
                cart_id = request.headers.get('X-Cart-ID')
                cart    = Cart.objects.get(cart_id=cart_id)
                item    = CartItem.objects.get(pk=item_id, cart=cart)
        except (CartItem.DoesNotExist, Cart.DoesNotExist):
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        if quantity < 1:
            item.delete()
            return Response({'message': 'Item removed.'})
        item.quantity = quantity
        item.save()
        return Response(CartItemSerializer(item).data)


class CartRemoveView(APIView):
    permission_classes = [permissions.AllowAny]

    def delete(self, request, item_id):
        try:
            if request.user.is_authenticated:
                item = CartItem.objects.get(pk=item_id, user=request.user)
            else:
                cart_id = request.headers.get('X-Cart-ID')
                cart    = Cart.objects.get(cart_id=cart_id)
                item    = CartItem.objects.get(pk=item_id, cart=cart)
        except (CartItem.DoesNotExist, Cart.DoesNotExist):
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        return Response({'message': 'Removed.'})


class CartMergeView(APIView):
    """
    Called immediately after login from Next.js.
    POST body: { cart_id: "<guest session id>" }
    Merges guest cart into the now-authenticated user's cart.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        cart_id = request.data.get('cart_id')
        if not cart_id:
            return Response({'merged': 0})
        try:
            cart            = Cart.objects.get(cart_id=cart_id)
            guest_items     = CartItem.objects.filter(cart=cart, active=True)
        except Cart.DoesNotExist:
            return Response({'merged': 0})

        merged = 0
        for guest_item in guest_items:
            guest_var_ids = sorted(guest_item.variations.values_list('id', flat=True))
            matched = False
            for user_item in CartItem.objects.filter(user=request.user, product=guest_item.product, active=True):
                if sorted(user_item.variations.values_list('id', flat=True)) == guest_var_ids:
                    user_item.quantity += guest_item.quantity
                    user_item.save()
                    guest_item.delete()
                    matched = True
                    merged += 1
                    break
            if not matched:
                guest_item.user = request.user
                guest_item.cart = None
                guest_item.save()
                merged += 1

        return Response({'merged': merged})


# ── Checkout + Orders ─────────────────────────────────────────

SHIPPING_FEES = {'pickup': 0, 'lagos': 4000, 'outside_lagos': 6000}


class PlaceOrderView(APIView):
    """
    Saves delivery info, calculates totals, creates a pending Order.
    Returns order_number for the payment step.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            items = CartItem.objects.filter(user=request.user, active=True)
        else:
            cart_id = request.headers.get('X-Cart-ID')
            try:
                cart  = Cart.objects.get(cart_id=cart_id)
                items = CartItem.objects.filter(cart=cart, active=True)
            except Cart.DoesNotExist:
                return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if not items.exists():
            return Response({'error': 'Cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        total           = sum(item.sub_total() for item in items)
        delivery_option = request.data.get('delivery_option', 'pickup')
        shipping_fee    = SHIPPING_FEES.get(delivery_option, 0)
        tax             = 0
        grand_total     = total + tax + shipping_fee

        order = Order.objects.create(
            user            = request.user if request.user.is_authenticated else None,
            first_name      = request.data.get('first_name', ''),
            last_name       = request.data.get('last_name', ''),
            phone           = request.data.get('phone', ''),
            email           = request.data.get('email', ''),
            address_line_1  = request.data.get('address_line_1', ''),
            address_line_2  = request.data.get('address_line_2', ''),
            country         = request.data.get('country', 'Nigeria'),
            state           = request.data.get('state', ''),
            city            = request.data.get('city', ''),
            order_note      = request.data.get('order_note', ''),
            order_total     = grand_total,
            shipping_fee    = shipping_fee,
            tax             = tax,
            delivery_option = delivery_option,
            ip              = request.META.get('REMOTE_ADDR', ''),
        )
        order.order_number = datetime.date.today().strftime('%Y%m%d') + str(order.id)
        order.save()

        return Response({
            'order_number': order.order_number,
            'grand_total' : grand_total,
            'tax'         : tax,
            'shipping_fee': shipping_fee,
        }, status=status.HTTP_201_CREATED)


def _complete_order(order, payment, request):
    """Shared post-payment logic for both gateways."""
    order.payment    = payment
    order.is_ordered = True
    order.status     = 'Completed'
    order.save()

    if request.user.is_authenticated:
        items = CartItem.objects.filter(user=request.user, active=True)
    else:
        try:
            cart  = Cart.objects.get(cart_id=request.headers.get('X-Cart-ID', ''))
            items = CartItem.objects.filter(cart=cart, active=True)
        except Cart.DoesNotExist:
            items = CartItem.objects.none()

    account_user = request.user if request.user.is_authenticated else None
    for item in items:
        price = float(item.product.price)
        for v in item.variations.all():
            if v.variation_category == 'quality':
                price += float(v.price_modifier)
        op = OrderProduct.objects.create(
            order         = order,
            payment       = payment,
            user          = account_user,
            product       = item.product,
            quantity      = item.quantity,
            product_price = price,
            ordered       = True,
        )
        op.variations.set(item.variations.all())
        item.product.stock -= item.quantity
        item.product.save()

    items.delete()

    # Confirmation email
    try:
        from django.core.mail import EmailMessage as DjEmailMessage
        msg = render_to_string('orders/order_confirmation_email.html', {
            'user' : account_user,
            'order': order,
        })
        to = account_user.email if account_user else order.email
        DjEmailMessage('Thank you for your order!', msg, to=[to]).send()
    except Exception as e:
        print('Order email failed:', e)


class FlutterwaveVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number   = request.data.get('orderID')
        transaction_id = request.data.get('transID')

        try:
            order = Order.objects.get(
                order_number=order_number,
                is_ordered=False,
                **({'user': request.user} if request.user.is_authenticated else {'user__isnull': True}),
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            resp   = http_requests.get(
                f'https://api.flutterwave.com/v3/transactions/{transaction_id}/verify',
                headers={'Authorization': f'Bearer {settings.FLUTTERWAVE_SECRET_KEY}'},
                timeout=15,
            )
            result = resp.json()
        except Exception as e:
            return Response({'error': 'Gateway error.'}, status=status.HTTP_502_BAD_GATEWAY)

        if result.get('status') == 'success' and result.get('data', {}).get('status') == 'successful':
            payment = Payment.objects.create(
                user           = request.user if request.user.is_authenticated else None,
                payment_id     = str(transaction_id),
                payment_method = 'Flutterwave',
                amount_paid    = result['data'].get('amount', 0),
                status         = 'successful',
            )
            _complete_order(order, payment, request)
            return Response({'status': 'success', 'order_number': order.order_number, 'payment_id': payment.payment_id})

        return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)


class PaystackVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = request.data.get('orderID')
        reference    = request.data.get('transID')

        try:
            order = Order.objects.get(
                order_number=order_number,
                is_ordered=False,
                **({'user': request.user} if request.user.is_authenticated else {'user__isnull': True}),
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            resp   = http_requests.get(
                f'https://api.paystack.co/transaction/verify/{reference}',
                headers={'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'},
                timeout=15,
            )
            result = resp.json()
        except Exception as e:
            return Response({'error': 'Gateway error.'}, status=status.HTTP_502_BAD_GATEWAY)

        data = result.get('data') or {}
        if data.get('status') == 'success':
            payment = Payment.objects.create(
                user           = request.user if request.user.is_authenticated else None,
                payment_id     = reference,
                payment_method = 'Paystack',
                amount_paid    = data.get('amount', 0) / 100,
                status         = 'success',
            )
            _complete_order(order, payment, request)
            return Response({'status': 'success', 'order_number': order.order_number, 'payment_id': payment.payment_id})

        return Response({'status': 'failed'}, status=status.HTTP_400_BAD_REQUEST)


class OrderListView(generics.ListAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user, is_ordered=True
        ).order_by('-created_at')


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field       = 'order_number'

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user, is_ordered=True)


class OrderCompleteView(APIView):
    """Called by Next.js after payment redirect with ?order_number=&payment_id="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_number = request.query_params.get('order_number')
        payment_id   = request.query_params.get('payment_id')
        try:
            order   = Order.objects.get(order_number=order_number, is_ordered=True)
            payment = Payment.objects.get(payment_id=payment_id)
        except (Order.DoesNotExist, Payment.DoesNotExist):
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        orders     = Order.objects.filter(user=request.user, is_ordered=True)
        total_spent = sum(o.order_total for o in orders)
        return Response({
            'order_count': orders.count(),
            'total_spent': total_spent,
            'recent'     : OrderSerializer(orders[:5], many=True).data,
        })
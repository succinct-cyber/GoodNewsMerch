import json
import datetime
import requests as http_requests

from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import EmailMessage
from django.core.exceptions import ValidationError as DjangoValidationError
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.conf import settings

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

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

DONE = ('Delivered', 'Completed')

def _get_tokens(user):
    """Return JWT access + refresh for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access' : str(refresh.access_token),
    }


# ── Register ─────────────────────────────────────────────────
import logging
logger = logging.getLogger(__name__)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        # Send verification email
        try:
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            html  = render_to_string('accounts/api_verify_email.html', {
                'user': user,
                'verify_url': f'{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}',
                'expiry_days': settings.PASSWORD_RESET_TIMEOUT // 86400,
            })
            mail = EmailMessage('Please activate your GoodNews Merch account', html, to=[user.email])
            mail.content_subtype = 'html'
            mail.send()
        except Exception:
            logger.exception('Verification email failed for %s', user.email)

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

def _unique_username(base):
    base = (base or 'user')[:40]
    username, n = base, 1
    while Account.objects.filter(username=username).exists():
        n += 1
        username = f'{base}{n}'
    return username

class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get('token')
        if not credential:
            return Response({'error': 'Token required.'}, status=400)
        if not settings.GOOGLE_CLIENT_ID:
            return Response({'error': 'Google sign-in is not configured.'}, status=500)
        try:
            info = id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        except ValueError:
            return Response({'error': 'Invalid Google token.'}, status=400)
        if not info.get('email_verified'):
            return Response({'error': 'Your Google email is not verified.'}, status=400)

        email   = info['email'].lower()
        user    = Account.objects.filter(email__iexact=email).first()
        created = False
        if user is None:
            user = Account.objects.create_user(
                first_name=info.get('given_name') or 'Friend',
                last_name =info.get('family_name') or '',
                username  =_unique_username(email.split('@')[0]),
                email     =email,
                password  =None,                  # unusable password
            )
            user.is_active = True
            user.save()
            UserProfile.objects.get_or_create(user=user)
            created = True
        elif not user.is_active:
            user.is_active = True                 # Google proved they own the inbox
            user.save(update_fields=['is_active'])

        return Response({**_get_tokens(user), 'user': UserSerializer(user).data, 'created': created})


# ── Current User ──────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]   # multipart = profile picture

    def _payload(self, request):
        profile = UserProfile.objects.get_or_create(user=request.user)[0]
        return {
            'user'   : UserSerializer(request.user).data,
            'profile': UserProfileSerializer(profile, context={'request': request}).data,
        }

    def get(self, request):
        return Response(self._payload(request))

    def patch(self, request):
        user_ser = UserSerializer(request.user, data=request.data, partial=True)
        user_ser.is_valid(raise_exception=True)
        profile  = UserProfile.objects.get_or_create(user=request.user)[0]
        prof_ser = UserProfileSerializer(profile, data=request.data, partial=True,
                                         context={'request': request})
        prof_ser.is_valid(raise_exception=True)
        user_ser.save(); prof_ser.save()
        return Response(self._payload(request))

# ── Password ──────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        user  = Account.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            try:
                uid   = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                html  = render_to_string('accounts/api_reset_email.html', {
                    'user': user,
                    'reset_url': f'{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}',
                    'expiry_days': settings.PASSWORD_RESET_TIMEOUT // 86400,
                })
                mail = EmailMessage('Reset your GoodNews Merch password', html, to=[user.email])
                mail.content_subtype = 'html'
                mail.send()
            except Exception:
                logger.exception('Password reset email failed for %s', user.email)
        # identical answer whether or not the account exists or the email sent
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


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password', '')
        new     = request.data.get('new_password', '')
        confirm = request.data.get('confirm_password', '')
        user    = request.user
        if new != confirm:
            return Response({'error': 'Passwords do not match.'}, status=400)
        # Google-only accounts have no password yet, so only check it if one exists
        if user.has_usable_password() and not user.check_password(current):
            return Response({'error': 'Current password is incorrect.'}, status=400)
        try:
            validate_password(new, user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=400)
        user.set_password(new)
        user.save()
        return Response({'message': 'Password updated successfully.'})

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
    order.status     = 'Received'
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
        html = render_to_string('orders/order_confirmation_email.html', {
            'user': account_user, 'order': order, 'site_url': settings.FRONTEND_URL,
        })
        mail = EmailMessage('Thank you for your order!', html,
                            to=[account_user.email if account_user else order.email])
        mail.content_subtype = 'html'      # without this, Gmail shows raw HTML source
        mail.send()
    except Exception:
        logger.exception('Order email failed')


def _paid_enough(order, amount, currency):
    """Reject underpayment or the wrong currency (1 kobo tolerance for float rounding)."""
    return currency == 'NGN' and float(amount) + 0.01 >= float(order.order_total)


def _find_open_order(request, order_number):
    kw = {'user': request.user} if request.user.is_authenticated else {'user__isnull': True}
    return Order.objects.filter(order_number=order_number, is_ordered=False, **kw).first()


class FlutterwaveVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number   = request.data.get('orderID')
        transaction_id = request.data.get('transID')
        if not order_number or not transaction_id:
            return Response({'error': 'Missing order or transaction id.'}, status=400)

        order = _find_open_order(request, order_number)
        if order is None:
            return Response({'error': 'Order not found.'}, status=404)

        try:
            resp   = http_requests.get(
                f'https://api.flutterwave.com/v3/transactions/{transaction_id}/verify',
                headers={'Authorization': f'Bearer {settings.FLUTTERWAVE_SECRET_KEY}'},
                timeout=15,
            )
            result = resp.json()
        except Exception:
            return Response({'error': 'Gateway error.'}, status=502)

        data = result.get('data') or {}
        if result.get('status') != 'success' or data.get('status') != 'successful':
            return Response({'status': 'failed'}, status=400)

        # 1. the transaction must be for THIS order (frontend tx_ref = "<order_number>_<timestamp>")
        if str(data.get('tx_ref', '')).rsplit('_', 1)[0] != order.order_number:
            return Response({'error': 'Transaction does not belong to this order.'}, status=400)
        # 2. the full amount, in naira
        if not _paid_enough(order, data.get('amount', 0), data.get('currency')):
            return Response({'error': 'Amount paid is less than the order total.'}, status=400)
        # 3. one transaction can only ever settle one order
        if Payment.objects.filter(payment_id=str(transaction_id)).exists():
            return Response({'error': 'This transaction has already been used.'}, status=400)

        payment = Payment.objects.create(
            user=request.user if request.user.is_authenticated else None,
            payment_id=str(transaction_id), payment_method='Flutterwave',
            amount_paid=data.get('amount', 0), status='successful',
        )
        _complete_order(order, payment, request)
        return Response({'status': 'success', 'order_number': order.order_number,
                         'payment_id': payment.payment_id})


class PaystackVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # ✅ the PAYSTACK_LIVE switch, enforced on the server
        if not settings.PAYSTACK_LIVE:
            return Response({'error': 'Paystack payments are not enabled.'}, status=403)

        order_number = request.data.get('orderID')
        reference    = request.data.get('transID')
        if not order_number or not reference:
            return Response({'error': 'Missing order or transaction id.'}, status=400)

        order = _find_open_order(request, order_number)
        if order is None:
            return Response({'error': 'Order not found.'}, status=404)

        try:
            resp   = http_requests.get(
                f'https://api.paystack.co/transaction/verify/{reference}',
                headers={'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}'},
                timeout=15,
            )
            result = resp.json()
        except Exception:
            return Response({'error': 'Gateway error.'}, status=502)

        data = result.get('data') or {}
        if data.get('status') != 'success':
            return Response({'status': 'failed'}, status=400)
        if not _paid_enough(order, (data.get('amount') or 0) / 100, data.get('currency')):   # kobo → naira
            return Response({'error': 'Amount paid is less than the order total.'}, status=400)
        if Payment.objects.filter(payment_id=reference).exists():
            return Response({'error': 'This transaction has already been used.'}, status=400)

        payment = Payment.objects.create(
            user=request.user if request.user.is_authenticated else None,
            payment_id=reference, payment_method='Paystack',
            amount_paid=data.get('amount', 0) / 100, status='success',
        )
        _complete_order(order, payment, request)
        return Response({'status': 'success', 'order_number': order.order_number,
                         'payment_id': payment.payment_id})


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
        base = Order.objects.filter(user=request.user, is_ordered=True).order_by('-created_at')
        return Response({
            'order_count'    : base.count(),
            'completed_count': base.filter(status__in=DONE).count(),
            'pending_count'  : base.exclude(status__in=DONE + ('Cancelled',)).count(),
            'recent'         : OrderSerializer(base[:5], many=True, context={'request': request}).data,
        })
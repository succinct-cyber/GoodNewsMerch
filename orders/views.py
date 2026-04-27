# orders/views.py\
import json
import datetime
from unittest import result
import requests

from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.conf import settings

from cart.models import CartItem, Cart
from .forms import OrderForm
from .models import Order, Payment, OrderProduct
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from cart.views import _cart_id


def _cart_item_unit_price(cart_item):
    price = float(cart_item.product.price)
    for v in cart_item.variations.all():
        if v.variation_category == 'quality':
            price += float(v.price_modifier)
    return price


@login_required(login_url='login')
def place_order(request, total=0, quantity=0):
    current_user = request.user

    if request.method != 'POST':
        return redirect('checkout')

    cart_items = CartItem.objects.filter(user=current_user)
    if cart_items.count() <= 0:
        return redirect('shop')

    grand_total = 0
    tax         = 0

    for cart_item in cart_items:
        total    += cart_item.sub_total()
        quantity += cart_item.quantity

    tax         = 0
    grand_total = total + tax

    form = OrderForm(request.POST)

    if form.is_valid():
        data                = Order()
        data.user           = current_user
        data.first_name     = form.cleaned_data['first_name']
        data.last_name      = form.cleaned_data['last_name']
        data.phone          = form.cleaned_data['phone']
        data.email          = form.cleaned_data['email']
        data.address_line_1 = form.cleaned_data['address_line_1']
        data.address_line_2 = form.cleaned_data['address_line_2']
        data.country        = form.cleaned_data['country']
        data.state          = form.cleaned_data['state']
        data.city           = form.cleaned_data['city']
        data.order_note     = form.cleaned_data['order_note']
        data.order_total    = grand_total
        data.tax            = tax
        data.ip             = request.META.get('REMOTE_ADDR')
        data.save()

        current_date      = datetime.date.today().strftime('%Y%m%d')
        data.order_number = current_date + str(data.id)
        data.save()

        order = Order.objects.get(
            user=current_user,
            is_ordered=False,
            order_number=data.order_number
        )
        payment_method = request.POST.get('payment_method', 'paystack')

        context = {
            'order'                 : order,
            'cart_items'            : cart_items,
            'total'                 : total,
            'tax'                   : tax,
            'grand_total'           : grand_total,
            'paystack_public_key'   : settings.PAYSTACK_PUBLIC_KEY,
            'flutterwave_public_key': settings.FLUTTERWAVE_PUBLIC_KEY,
            'payment_method'        : payment_method,
        }

        if payment_method == 'flutterwave':
            return render(request, 'orders/flutterwave_payment.html', context)
        return render(request, 'orders/payment.html', context)

    return redirect('checkout')


def payments(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

    order_number = body.get('orderID')
    reference = body.get('transID')
    if not order_number or not reference:
        return JsonResponse({'status': 'error', 'message': 'Missing order or transaction id'}, status=400)

    if request.user.is_authenticated:
        try:
            order = Order.objects.get(
                user=request.user,
                is_ordered=False,
                order_number=order_number,
            )
        except Order.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Order not found'}, status=404)
    else:
        try:
            order = Order.objects.get(
                user__isnull=True,
                is_ordered=False,
                order_number=order_number,
            )
        except Order.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Order not found'}, status=404)

    headers = {
        'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json',
    }
    url = f'https://api.paystack.co/transaction/verify/{reference}'
    response = requests.get(url, headers=headers)
    result = response.json()

    data = result.get('data') or {}
    if data.get('status') != 'success':
        return JsonResponse({'status': 'failed'}, status=400)

    payment = Payment()
    payment.user = request.user if request.user.is_authenticated else None
    payment.payment_id = reference
    payment.payment_method = 'Paystack'
    payment.amount_paid = data.get('amount', 0) / 100
    payment.status = data.get('status', '')
    payment.save()

    order.payment = payment
    order.is_ordered = True
    order.status = 'Completed'
    order.save()

    if request.user.is_authenticated:
        cart_items = CartItem.objects.filter(user=request.user, active=True)
    else:
        try:
            cart = Cart.objects.get(cart_id=_cart_id(request))
            cart_items = CartItem.objects.filter(cart=cart, active=True)
        except Cart.DoesNotExist:
            cart_items = CartItem.objects.none()

    account_user = request.user if request.user.is_authenticated else None
    for item in cart_items:
        unit = _cart_item_unit_price(item)
        order_product = OrderProduct()
        order_product.order = order
        order_product.payment = payment
        order_product.user = account_user
        order_product.product = item.product
        order_product.quantity = item.quantity
        order_product.product_price = unit
        order_product.ordered = True
        order_product.save()
        order_product.variations.set(item.variations.all())

        item.product.stock -= item.quantity
        item.product.save()

    cart_items.delete()

    try:
        mail_subject = 'Thank you for your order!'
        message = render_to_string('orders/order_confirmation_email.html', {
            'user': account_user,
            'order': order,
        })
        to_email = account_user.email if account_user else order.email
        send_email = EmailMessage(mail_subject, message, to=[to_email])
        send_email.content_subtype = 'html'
        send_email.send()
    except Exception as e:
        print('Order email failed:', e)

    return JsonResponse({
        'status': 'success',
        'order_number': order.order_number,
        'payment_id': payment.payment_id,
    })



@login_required(login_url='login')
def payment(request, order_number):
    order      = Order.objects.get(order_number=order_number, user=request.user)
    cart_items = CartItem.objects.filter(user=request.user)

    total      = 0
    for item in cart_items:
        item_price = item.product.price
        for v in item.variations.all():
            if v.variation_category == 'quality':
                item_price += v.price_modifier
        total += item_price * item.quantity

    tax        = 0
    grand_total = total + tax

    context = {
        'order':              order,
        'cart_items':         cart_items,
        'total':              total,
        'tax':                tax,
        'grand_total':        grand_total,
        'paystack_public_key': getattr(settings, 'PAYSTACK_PUBLIC_KEY', '') or '',
        'paystack_key_missing': not bool(getattr(settings, 'PAYSTACK_PUBLIC_KEY', '') or ''),
    }
    return render(request, 'orders/payment.html', context)


def order_complete(request):
    order_number = request.GET.get('order_number')
    payment_id   = request.GET.get('payment_id')

    try:
        order          = Order.objects.get(order_number=order_number, is_ordered=True)
        order_products = OrderProduct.objects.filter(order=order)
        payment        = Payment.objects.get(payment_id=payment_id)
        subtotal       = sum(
                            item.product_price * item.quantity
                            for item in order_products
                         )
        context = {
            'order'         : order,
            'order_products': order_products,
            'payment'       : payment,
            'subtotal'      : subtotal,
        }
        return render(request, 'orders/order_complete.html', context)

    except (Order.DoesNotExist, Payment.DoesNotExist):
        return redirect('home')
    

def guest_checkout(request):
    if request.user.is_authenticated:
        cart_items = CartItem.objects.filter(user=request.user)
    else:
        try:
            cart       = Cart.objects.get(cart_id=_cart_id(request))
            cart_items = CartItem.objects.filter(cart=cart, active=True)
        except Cart.DoesNotExist:
            return redirect('store')

    if not cart_items.exists():
        return redirect('store')

    total = 0
    quantity = 0
    for item in cart_items:
        total += item.sub_total()
        quantity += item.quantity

    tax         = 0
    grand_total = total + tax

    context = {
        'cart_items': cart_items,
        'total'     : total,
        'tax'       : tax,
        'grand_total': grand_total,
    }
    return render(request, 'orders/guest_checkout.html', context)


def guest_place_order(request):
    
    if request.method != 'POST':
        return redirect('guest_checkout')

    if request.user.is_authenticated:
        cart_items = CartItem.objects.filter(user=request.user)
    else:
        try:
            cart       = Cart.objects.get(cart_id=_cart_id(request))
            cart_items = CartItem.objects.filter(cart=cart, active=True)
        except Cart.DoesNotExist:
            return redirect('shop')

    if not cart_items.exists():
        return redirect('shop')

    total = 0
    quantity = 0
    for item in cart_items:
        total += item.sub_total()
        quantity += item.quantity

    tax         = 0
    grand_total = total + tax

    # Build order — no user FK required (guest)
    data                = Order()
    data.user           = request.user if request.user.is_authenticated else None
    data.first_name     = request.POST.get('first_name', '')
    data.last_name      = request.POST.get('last_name', '')
    data.phone          = request.POST.get('phone', '')
    data.email          = request.POST.get('email', '')
    data.address_line_1 = request.POST.get('address_line_1', '')
    data.address_line_2 = request.POST.get('address_line_2', '')
    data.country        = request.POST.get('country', 'Nigeria')
    data.state          = request.POST.get('state', '')
    data.city           = request.POST.get('city', '')
    data.order_note     = request.POST.get('order_note', '')
    data.order_total    = grand_total
    data.tax            = tax
    data.ip             = request.META.get('REMOTE_ADDR')
    data.save()

    current_date      = datetime.date.today().strftime('%Y%m%d')
    data.order_number = current_date + str(data.id)
    data.save()

    pk    = getattr(settings, 'PAYSTACK_PUBLIC_KEY',     '') or ''
    fw_pk = getattr(settings, 'FLUTTERWAVE_PUBLIC_KEY',  '') or ''

    payment_method = request.POST.get('payment_method', 'paystack')

    context = {
        'order'                 : data,
        'cart_items'            : cart_items,
        'total'                 : total,
        'tax'                   : tax,
        'grand_total'           : grand_total,
        'paystack_public_key'   : pk,
        'paystack_key_missing'  : not bool(pk),
        'flutterwave_public_key': fw_pk,
        'payment_method'        : payment_method,
    }

    if payment_method == 'flutterwave':
        return render(request, 'orders/flutterwave_payment.html', context)
    return render(request, 'orders/payment.html', context)


@login_required(login_url='login')
def flutterwave_payment(request, order_number):
    order      = Order.objects.get(order_number=order_number, user=request.user)
    cart_items = CartItem.objects.filter(user=request.user)

    total    = 0
    for item in cart_items:
        item_price = item.product.price
        for v in item.variations.all():
            if v.variation_category == 'quality':
                item_price += v.price_modifier
        total += item_price * item.quantity

    tax         = round((2 * total) / 100, 2)
    grand_total = total + tax

    context = {
        'order'                 : order,
        'cart_items'            : cart_items,
        'total'                 : total,
        'tax'                   : tax,
        'grand_total'           : grand_total,
        'flutterwave_public_key': settings.FLUTTERWAVE_PUBLIC_KEY,
    }
    return render(request, 'orders/flutterwave_payment.html', context)


def flutterwave_verify(request):
    if request.method != 'POST':
        return redirect('home')

    try:
        body           = json.loads(request.body)
        order_number   = body['orderID']
        transaction_id = body['transID']
    except (json.JSONDecodeError, KeyError):
        return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

    if request.user.is_authenticated:
        try:
            order = Order.objects.get(
                user=request.user,
                is_ordered=False,
                order_number=order_number,
            )
        except Order.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Order not found'}, status=404)
    else:
        try:
            order = Order.objects.get(
                user__isnull=True,
                is_ordered=False,
                order_number=order_number,
            )
        except Order.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Order not found'}, status=404)

    try:
        headers  = {'Authorization': f'Bearer {settings.FLUTTERWAVE_SECRET_KEY}'}
        url      = f'https://api.flutterwave.com/v3/transactions/{transaction_id}/verify'
        response = requests.get(url, headers=headers, timeout=15)
        result   = response.json()
    except Exception as e:
        # network failure, bad JSON from Flutterwave, etc.
        print('Flutterwave API error:', e)
        return JsonResponse({'status': 'error', 'message': 'Payment gateway error'}, status=502)

    # ✅ .get() everywhere — no KeyError possible
    if result.get('status') == 'success' and result.get('data', {}).get('status') == 'successful':
        data        = result['data']
        amount_paid = data.get('amount', 0)

        payment                = Payment()
        payment.user           = request.user if request.user.is_authenticated else None
        payment.payment_id     = str(transaction_id)
        payment.payment_method = 'Flutterwave'
        payment.amount_paid    = amount_paid
        payment.status         = 'successful'
        payment.save()

        order.payment    = payment
        order.is_ordered = True
        order.status     = 'Completed'
        order.save()

        if request.user.is_authenticated:
            cart_items = CartItem.objects.filter(user=request.user, active=True)
        else:
            try:
                cart       = Cart.objects.get(cart_id=_cart_id(request))
                cart_items = CartItem.objects.filter(cart=cart, active=True)
            except Cart.DoesNotExist:
                cart_items = CartItem.objects.none()

        account_user = request.user if request.user.is_authenticated else None
        for item in cart_items:
            order_product               = OrderProduct()
            order_product.order         = order
            order_product.payment       = payment
            order_product.user          = account_user
            order_product.product       = item.product
            order_product.quantity      = item.quantity
            order_product.product_price = _cart_item_unit_price(item)
            order_product.ordered       = True
            order_product.save()
            order_product.variations.set(item.variations.all())

            item.product.stock -= item.quantity
            item.product.save()

        cart_items.delete()

        try:
            mail_subject = 'Thank you for your order!'
            message      = render_to_string('orders/order_confirmation_email.html', {
                'user' : account_user,
                'order': order,
            })
            to_email   = account_user.email if account_user else order.email
            send_email = EmailMessage(mail_subject, message, to=[to_email])
            send_email.content_subtype = 'html'
            send_email.send()
        except Exception as e:
            print('Order email failed:', e)

        return JsonResponse({
            'status'      : 'success',
            'order_number': order.order_number,
            'payment_id'  : payment.payment_id,
        })

    print('Flutterwave verification failed. Response:', result)
    return JsonResponse({'status': 'failed'}, status=400)
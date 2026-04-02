# orders/views.py\
import json
import datetime
import requests

from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required
from django.conf import settings

from cart.models import CartItem
from .forms import OrderForm
from .models import Order, Payment, OrderProduct
from django.core.mail import EmailMessage
from django.template.loader import render_to_string



@login_required(login_url='login')
def place_order(request, total=0, quantity=0):
    current_user = request.user

    if request.method != 'POST':
        return redirect('checkout')

    cart_items = CartItem.objects.filter(user=current_user)
    if cart_items.count() <= 0:
        return redirect('store')

    grand_total = 0
    tax         = 0

    for cart_item in cart_items:
        total    += (cart_item.product.price * cart_item.quantity)
        quantity += cart_item.quantity

    tax         = round((2 * total) / 100, 2)
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

        context = {
            'order'              : order,
            'cart_items'         : cart_items,
            'total'              : total,
            'tax'                : tax,
            'grand_total'        : grand_total,
            'paystack_public_key': settings.PAYSTACK_PUBLIC_KEY,
        }
        return render(request, 'orders/payment.html', context)

    # Form invalid — go back to checkout
    return redirect('checkout')


@login_required(login_url='login')
def payments(request):
    if request.method != 'POST':
        return redirect('home')  # ← was 'payments' = infinite loop

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

    try:
        order = Order.objects.get(
            user=request.user,
            is_ordered=False,
            order_number=body['orderID']
        )
    except Order.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Order not found'}, status=404)

    reference = body['transID']
    headers   = {
        'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
        'Content-Type' : 'application/json',
    }
    url      = f'https://api.paystack.co/transaction/verify/{reference}'
    response = requests.get(url, headers=headers)
    result   = response.json()

    if result['data']['status'] == 'success':
        payment                = Payment()
        payment.user           = request.user
        payment.payment_id     = reference
        payment.payment_method = 'Paystack'
        payment.amount_paid    = result['data']['amount'] / 100
        payment.status         = result['data']['status']
        payment.save()

        order.payment    = payment
        order.is_ordered = True
        order.save()

        cart_items = CartItem.objects.filter(user=request.user)
        for item in cart_items:
            order_product               = OrderProduct()
            order_product.order         = order
            order_product.payment       = payment
            order_product.user          = request.user
            order_product.product       = item.product
            order_product.quantity      = item.quantity
            order_product.product_price = item.product.price
            order_product.ordered       = True
            order_product.save()
            order_product.variations.set(item.variations.all())

            item.product.stock -= item.quantity
            item.product.save()

        CartItem.objects.filter(user=request.user).delete()

        try:
            mail_subject = 'Thank you for your order!'
            message      = render_to_string('orders/order_confirmation_email.html', {
                'user' : request.user,
                'order': order,
            })
            send_email = EmailMessage(mail_subject, message, to=[request.user.email])
            send_email.content_subtype = 'html'
            send_email.send()
        except Exception as e:
            print('Order email failed:', e)

        return JsonResponse({
            'status'      : 'success',
            'order_number': order.order_number,
            'payment_id'  : payment.payment_id,
        })

    return JsonResponse({'status': 'failed'}, status=400)



# orders/views.py — payment view

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

    tax        = round((2 * total) / 100, 2)
    grand_total = total + tax

    context = {
        'order':              order,
        'cart_items':         cart_items,
        'total':              total,
        'tax':                tax,
        'grand_total':        grand_total,
        'paystack_public_key': settings.PAYSTACK_PUBLIC_KEY,
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
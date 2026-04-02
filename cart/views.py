from django.shortcuts import render, redirect, get_object_or_404
from .models import Cart, CartItem
from store.models import Product, Variation
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required

from django.http import HttpResponse

# Create your views here.

def _cart_id(request):
    cart = request.session.session_key
    if not cart:
        cart = request.session.create()
    return cart

def add_cart(request, product_id):
    cart_item_id = request.GET.get('cart_item_id')
    if cart_item_id:
    # Direct increment from cart page — no variation matching needed
        item = get_object_or_404(CartItem, id=cart_item_id)
        item.quantity += 1
        item.save()
        return redirect('cart')
    
    current_user = request.user
    product      = get_object_or_404(Product, id=product_id)

    # Collect selected variations from POST
    product_variation = []
    if request.method == 'POST':
        for key in request.POST:
            value = request.POST[key]
            try:
                variation = Variation.objects.get(
                    product=product,
                    variation_category__iexact=key,
                    variation_value__iexact=value
                )
                product_variation.append(variation)
            except Variation.DoesNotExist:
                pass

    if current_user.is_authenticated:
        cart_items = CartItem.objects.filter(product=product, user=current_user)

        # Compare variation sets to find exact match
        existing_item = None
        for item in cart_items:
            existing_vars = sorted(item.variations.values_list('id', flat=True))
            new_vars      = sorted(v.id for v in product_variation)
            if existing_vars == new_vars:   # exact same combo found
                existing_item = item
                break

        if existing_item:
            existing_item.quantity += 1
            existing_item.save()
        else:
            new_item = CartItem.objects.create(
                product=product,
                user=current_user,
                quantity=1
            )
            if product_variation:
                new_item.variations.set(product_variation)
            new_item.save()

    else:
        cart, _ = Cart.objects.get_or_create(cart_id=_cart_id(request))
        cart_items = CartItem.objects.filter(product=product, cart=cart)

        existing_item = None
        for item in cart_items:
            existing_vars = sorted(item.variations.values_list('id', flat=True))
            new_vars      = sorted(v.id for v in product_variation)
            if existing_vars == new_vars:
                existing_item = item
                break

        if existing_item:
            existing_item.quantity += 1
            existing_item.save()
        else:
            new_item = CartItem.objects.create(
                product=product,
                cart=cart,
                quantity=1
            )
            if product_variation:
                new_item.variations.set(product_variation)
            new_item.save()

    return redirect('cart')
    
def remove_cart(request, product_id, cart_item_id):

    product = get_object_or_404(Product, id=product_id)
    try:
        if request.user.is_authenticated:
            cart_item = CartItem.objects.get(product=product, user=request.user, id=cart_item_id)
        else:
            cart = Cart.objects.get(cart_id=_cart_id(request))
            cart_item = CartItem.objects.get(product=product, cart=cart, id=cart_item_id)
        if cart_item.quantity > 1:
            cart_item.quantity -= 1
            cart_item.save()
        else:
            cart_item.delete()
    except:
        pass
    return redirect('cart')


def remove_cart_item(request, product_id, cart_item_id):
    product = get_object_or_404(Product, id=product_id)
    if request.user.is_authenticated:
        cart_item = CartItem.objects.get(product=product, user=request.user, id=cart_item_id)
    else:
        cart = Cart.objects.get(cart_id=_cart_id(request))
        cart_item = CartItem.objects.get(product=product, cart=cart, id=cart_item_id)
    cart_item.delete()
    return redirect('cart')
    
def cart(request, total=0, quantity=0, cart_items=None):    
    try:
        tax = 0
        grand_total = 0
        
        if request.user.is_authenticated:
            cart_items = CartItem.objects.filter(user=request.user, active=True)
        else:
            cart = Cart.objects.get(cart_id=_cart_id(request))
            cart_items = CartItem.objects.filter(cart=cart, active=True)

        for cart_item in cart_items:
            item_price = cart_item.product.price
            total += (item_price * cart_item.quantity)
            quantity += cart_item.quantity

            # for variation in cart_item.variations.all():
            #     if variation.variation_category == 'quality':
            #         item_price += variation.price_modifier
            # total    += item_price * cart_item.quantity
            # quantity += cart_item.quantity


        tax = (2 * total)/100
        grand_total = total + tax

    except ObjectDoesNotExist:
        pass

    context = {
        'total': total,
        'quantity': quantity,
        'cart_items': cart_items,
        'tax'       : tax,
        'grand_total': grand_total,
    }
    return render(request, 'store/cart.html', context)

def checkout(request, total=0, quantity=0, cart_items=None):
    try:
        tax = 0
        grand_total = 0
        if request.user.is_authenticated:
            cart_items = CartItem.objects.filter(user=request.user, active=True)
        else:
            cart = Cart.objects.get(cart_id=_cart_id(request))
            cart_items = CartItem.objects.filter(cart=cart, active=True)
        for cart_item in cart_items:
            total += (cart_item.product.price * cart_item.quantity)
            quantity += cart_item.quantity
        tax = (2 * total)/100
        grand_total = total + tax
    except ObjectDoesNotExist:
        pass #just ignore

    context = {
        'total': total,
        'quantity': quantity,
        'cart_items': cart_items,
        'tax'       : tax,
        'grand_total': grand_total,
    }
    return render(request, 'store/checkout.html', context)
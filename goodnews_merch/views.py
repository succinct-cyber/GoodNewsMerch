from urllib import request

from django.shortcuts import render
from store.models import Product
from store.models import ReviewRating

def home(request):
    products = Product.objects.all().filter(is_available=True).order_by('created_date')

    # for product in products:
    
        # reviews = ReviewRating.objects.filter(product_id=product.id, status=True)
    
    context = {
        'products': products,
        # 'reviews': reviews
    }
    return render(request, 'home.html', context)

def fundraising(request):
    return render(request, 'fundraising.html')

def contact(request):
    return render(request, 'contact.html')
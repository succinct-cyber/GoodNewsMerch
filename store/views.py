from django.shortcuts import render, get_object_or_404
from .models import Product, Variation
from category.models import Category
from django.db.models import Q
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from cart.models import CartItem, Cart
from cart.views import _cart_id

def store(request, category_slug=None):
    categories   = None
    products     = None
    current_category      = None
    current_category_name = None

    if category_slug:
        # Filter by clicked category
        categories = get_object_or_404(Category, slug=category_slug)
        products   = Product.objects.filter(
                         category=categories,
                         is_available=True
                     ).order_by('created_date')
        current_category      = category_slug
        current_category_name = categories.category_name
        paginator = Paginator(products, 3)
        page = request.GET.get('page')
        paged_products = paginator.get_page(page)
    else:
        # Show all products
        products = Product.objects.filter(is_available=True).order_by('created_date')
        paginator = Paginator(products, 3)
        page = request.GET.get('page')
        paged_products = paginator.get_page(page)

    products_count = products.count()
    all_categories = Category.objects.all()

    context = {
        'products':             products,
        'products_count':        products_count,
        'categories':           all_categories,
        'current_category':     current_category,
        'current_category_name': current_category_name,
        'paged_products':       paged_products,
    }
    return render(request, 'store/store.html', context)

def product_detail(request, category_slug, product_slug):
    try:
        single_product = Product.objects.get(category__slug=category_slug, slug=product_slug)
        in_cart = CartItem.objects.filter(cart__cart_id=_cart_id(request), product=single_product).exists()
    except Exception as e:
        raise e

    # Fetch all variation types for this product
    colors    = Variation.objects.colors().filter(product=single_product)
    sizes     = Variation.objects.sizes().filter(product=single_product)
    qualities = Variation.objects.qualities().filter(product=single_product)

    context = {
        'single_product': single_product,
        'colors':         colors,
        'sizes':          sizes,
        'qualities':      qualities,
        'in_cart':        in_cart,
    }
    return render(request, 'store/product_detail.html', context)

def search(request):
    products = Product.objects.none()
    products_count = 0
    category = Category.objects.filter()
    keyword = request.GET.get('keyword', '').strip()

    if keyword:
        products = Product.objects.filter(
            Q(product_name__icontains=keyword) |
            Q(description__icontains=keyword) |
            Q(category__category_name__icontains=keyword)
        ).order_by('-created_date').distinct()

        products_count = products.count()
            
    context = {
        'products': products,
        'keyword': keyword,
        'products_count': products_count,
        'category': category,
    }

    return render(request, 'store/store.html', context)





# Create your views here.

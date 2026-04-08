from django.shortcuts import render, get_object_or_404, redirect
from django.db.models import Q
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from .models import Product, Variation, ReviewRating, ProductGallery
from .forms import ReviewForm
from category.models import Category
from django.core.paginator import Paginator
from cart.models import CartItem, Cart
from cart.views import _cart_id
from orders.models import OrderProduct


def store(request, category_slug=None):
    current_category = None
    current_category_name = None

    if category_slug:
        category = get_object_or_404(Category, slug=category_slug)
        products_qs = Product.objects.filter(
            category=category,
            is_available=True,
        ).order_by('created_date')
        current_category = category_slug
        current_category_name = category.category_name
        category_count = Category.objects.count()
    else:
        products_qs = Product.objects.filter(is_available=True).order_by('created_date')
        category_count = Category.objects.count()
    paginator = Paginator(products_qs, 3)
    page = request.GET.get('page')
    # Page object: template uses products.has_other_pages, products.number, etc.
    products_page = paginator.get_page(page)

    products_count = products_qs.count()
    all_categories = Category.objects.all()

    context = {
        'products': products_page,
        'products_count': products_count,
        'categories': all_categories,
        'category_count': category_count,
        'current_category': current_category,
        'current_category_name': current_category_name,
    }
    return render(request, 'store/store.html', context)

def _dedupe_by_value(variation_qs):
    """Keep one active variation per display value (case-insensitive)."""
    seen = set()
    out = []
    for v in variation_qs.order_by('id'):
        key = v.variation_value.strip().lower()
        if key not in seen:
            seen.add(key)
            out.append(v)
    return out


# Canonical quality tiers: DB may use "heavy weight" vs "heavyweight", etc.
_QUALITY_SPECS = (
    ('standard', ('standard',)),
    ('premium', ('premium',)),
    ('heavyweight', ('heavyweight', 'heavy weight', 'heavy-weight')),
)


def _qualities_for_product(product):
    qs = Variation.objects.qualities().filter(product=product)
    resolved = []
    for _slug, aliases in _QUALITY_SPECS:
        match = None
        for alias in aliases:
            match = qs.filter(variation_value__iexact=alias).first()
            if match:
                break
        if match:
            resolved.append(match)
    return resolved


_SIZE_ORDER = ('xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl')


def _sort_sizes(size_list):
    def sort_key(v):
        raw = v.variation_value.strip().lower()
        try:
            return (0, _SIZE_ORDER.index(raw))
        except ValueError:
            return (1, raw)

    return sorted(size_list, key=sort_key)


# store/views.py — product_detail()

def product_detail(request, category_slug, product_slug):
    single_product = get_object_or_404(
        Product,
        category__slug=category_slug,
        slug=product_slug,
        is_available=True,
    )

    colors    = Variation.objects.colors().filter(product=single_product)
    sizes     = Variation.objects.sizes().filter(product=single_product)
    qualities = Variation.objects.qualities().filter(product=single_product)

    product_gallery = ProductGallery.objects.filter(product=single_product)

    is_ordered = False
    if request.user.is_authenticated:
        from orders.models import OrderProduct
        is_ordered = OrderProduct.objects.filter(
            user=request.user,
            product=single_product,
            ordered=True,
        ).exists()

    reviews      = ReviewRating.objects.filter(product=single_product, status=True)
    review_count = reviews.count()
    from django.db.models import Avg
    avg_rating   = reviews.aggregate(avg=Avg('rating'))['avg'] or 0

    context = {
        'single_product' : single_product,
        'colors'         : colors,
        'sizes'          : sizes,
        'qualities'      : qualities,
        'product_gallery': product_gallery,
        'is_ordered'     : is_ordered,
        'reviews'        : reviews,
        'review_count'   : review_count,
        'avg_rating'     : round(avg_rating, 1),
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


@login_required(login_url='login')
def submit_review(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    next_url = request.META.get('HTTP_REFERER') or product.get_url()

    if request.method != 'POST':
        return redirect(next_url)

    if not OrderProduct.objects.filter(product=product, user=request.user, ordered=True).exists():
        messages.error(request, 'You can only review products you have purchased.')
        return redirect(next_url)

    try:
        existing = ReviewRating.objects.get(user=request.user, product_id=product_id)
        form = ReviewForm(request.POST, instance=existing)
        if form.is_valid():
            form.save()
            messages.success(request, 'Thank you! Your review has been updated.')
        else:
            messages.error(request, 'Please correct the errors below.')
        return redirect(next_url)
    except ReviewRating.DoesNotExist:
        form = ReviewForm(request.POST)
        if form.is_valid():
            rev = form.save(commit=False)
            rev.user = request.user
            rev.product_id = product_id
            rev.ip = request.META.get('REMOTE_ADDR', '')
            rev.save()
            messages.success(request, 'Thank you! Your review has been submitted.')
        else:
            messages.error(request, 'Please correct the errors below.')
        return redirect(next_url)





# Create your views here.

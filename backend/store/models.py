from django.db import models
from django.urls import reverse
from django.db.models import Avg, Count


# Create your models here.
class Product(models.Model):
    product_name = models.CharField(max_length=200, unique=True)
    slug         = models.SlugField(max_length=200, unique=True)
    description  = models.TextField(max_length=500, blank=True)
    price        = models.DecimalField(max_digits=10, decimal_places=2)
    images       = models.ImageField(upload_to='photos/products', blank=True)
    stock        = models.IntegerField()
    is_available = models.BooleanField(default=True)
    category     = models.ForeignKey('category.Category', on_delete=models.CASCADE)
    created_date = models.DateTimeField(auto_now_add=True)
    modified_date= models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'product'
        verbose_name_plural = 'products'

    def get_url(self):
        return reverse('product_detail', args=[self.category.slug, self.slug])

    def __str__(self):
        return self.product_name
    
    def avgReview(self):
        reviews = ReviewRating.objects.filter(product=self, status=True).aggregate(average=Avg('rating'))
        avg = 0
        if reviews['average'] is not None:
            avg = float(reviews['average'])
        return avg

    def countReview(self):
        reviews = ReviewRating.objects.filter(product=self, status=True).aggregate(count=Count('id'))
        count = 0
        if reviews['count'] is not None:
            count = int(reviews['count'])
        return count



class VariationManager(models.Manager):
    def colors(self):
        return super().get_queryset().filter(
            variation_category='color', is_active=True
        )

    def sizes(self):
        return super().get_queryset().filter(
            variation_category='size', is_active=True
        )

    def qualities(self):
        return super().get_queryset().filter(
            variation_category='quality', is_active=True
        ).order_by('price_modifier')


class Variation(models.Model):
    VARIATION_CATEGORY_CHOICES = (
        ('color',   'Color'),
        ('size',    'Size'),
        ('quality', 'Quality'),
    )

    objects = VariationManager()

    product            = models.ForeignKey(Product, on_delete=models.CASCADE)
    variation_category = models.CharField(max_length=100, choices=VARIATION_CATEGORY_CHOICES)
    variation_value    = models.CharField(max_length=100)
    price_modifier     = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active          = models.BooleanField(default=True)
    created_date       = models.DateTimeField(auto_now=True)

    def display_label(self):
        """Human-readable label (especially for quality tiers)."""
        raw = self.variation_value.strip()
        if self.variation_category == 'quality':
            key = raw.lower().replace('-', ' ')
            quality_map = {
                'standard': 'Standard',
                'premium': 'Premium',
                'heavyweight': 'Heavyweight',
            }
            return quality_map.get(key, raw.title())
        return raw

    def __str__(self):
        if self.price_modifier > 0:
            return f'{self.variation_value} ( +₦ {self.price_modifier})'
        return self.variation_value
    

class ReviewRating(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    user = models.ForeignKey('accounts.Account', on_delete=models.CASCADE)
    subject = models.CharField(max_length=100, blank=True)
    review = models.TextField(max_length=500, blank=True)
    rating = models.FloatField()
    ip = models.CharField(max_length=20, blank=True)
    status = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.subject or '(no subject)'


class ProductGallery(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='gallery')
    # null=True: optional extra photos — avoids NOT NULL / empty-file edge cases in admin inlines
    image = models.ImageField(upload_to='photos/products/gallery/')
    

    def __str__(self):
        return self.product.product_name

    class Meta:
        verbose_name = 'productgallery'
        verbose_name_plural = 'product gallery'
    

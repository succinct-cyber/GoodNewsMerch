from django.db import models
from django.urls import reverse


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

    def __str__(self):
        if self.price_modifier > 0:
            return f'{self.variation_value} (+₦{self.price_modifier})'
        return self.variation_value
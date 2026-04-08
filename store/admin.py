from django.contrib import admin
from django.utils.html import format_html
from .models import Product, Variation, ReviewRating, ProductGallery


class VariationInline(admin.TabularInline):
    model         = Variation
    extra         = 3
    fields        = ('variation_category', 'variation_value', 'price_modifier', 'is_active')


class ProductGalleryInline(admin.TabularInline):
    model           = ProductGallery
    extra           = 1
    readonly_fields = ('image_preview',)

    def image_preview(self, obj):
        if getattr(obj, 'image', None) and obj.image:
            return format_html(
                '<img src="{}" style="max-height:72px;max-width:120px;object-fit:contain;" alt=""/>',
                obj.image.url,
            )
        return '—'
    image_preview.short_description = 'Preview'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    prepopulated_fields = {'slug': ('product_name',)}
    list_display        = ('product_name', 'thumbnail', 'price', 'stock', 'is_available', 'category')
    list_editable       = ('price', 'stock', 'is_available')
    list_filter         = ('is_available', 'created_date', 'category')
    search_fields       = ('product_name', 'description')
    inlines             = [VariationInline, ProductGalleryInline]

    def thumbnail(self, obj):
        try:
            if obj.images:
                return format_html(
                    '<img src="{}" width="48" height="48" style="object-fit:cover;" alt=""/>',
                    obj.images.url,
                )
        except ValueError:
            pass
        return '—'
    thumbnail.short_description = 'Image'


@admin.register(ReviewRating)
class ReviewRatingAdmin(admin.ModelAdmin):
    list_display  = ('user', 'product', 'rating', 'status', 'created_at')
    list_editable = ('status',)
    list_filter   = ('status', 'product')
    search_fields = ('user__email', 'product__product_name')
    readonly_fields = ('user', 'product', 'ip')
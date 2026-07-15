from django.contrib import admin
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from .models import Order, Payment, OrderProduct

class OrderProductInline(admin.TabularInline):
    model = OrderProduct
    readonly_fields = ('payment', 'user', 'product', 'variations', 'quantity', 'product_price', 'ordered')
    can_delete = False
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ('order_number', 'full_name', 'status', 'delivery_option', 'order_total', 'created_at')
    list_filter   = ('status', 'delivery_option', 'is_ordered')
    search_fields = ('order_number', 'first_name', 'last_name', 'email')
    list_editable = ('status',)
    readonly_fields = ('order_number', 'ip', 'created_at')
    inlines = [OrderProductInline]

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data:
            try:
                message = render_to_string('orders/emails/order_status_update.html', {
                    'order': obj,
                })
                email = EmailMessage(
                    f'Update on your GoodNews Merch Order #{obj.order_number}',
                    message,
                    to=[obj.email],
                )
                email.content_subtype = 'html'
                email.send()
            except Exception as e:
                print(f'Status update email failed: {e}')
        super().save_model(request, obj, form, change)
    
    

admin.site.register(Payment)
admin.site.register(Order, OrderAdmin)
admin.site.register(OrderProduct)


# Register your models here.
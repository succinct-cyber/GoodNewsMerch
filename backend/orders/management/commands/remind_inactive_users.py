from django.core.management.base import BaseCommand
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from accounts.models import Account
from orders.models import Order


class Command(BaseCommand):
    help = 'Email registered users who have never placed an order'

    def handle(self, *args, **kwargs):
        users_with_orders = Order.objects.filter(
            is_ordered=True,
            user__isnull=False
        ).values_list('user_id', flat=True).distinct()

        targets = Account.objects.filter(
            is_active=True,
            is_admin=False,
        ).exclude(id__in=users_with_orders)

        sent = 0
        for user in targets:
            try:
                message = render_to_string(
                    'orders/emails/remind_first_order.html',
                    {'user': user}
                )
                email = EmailMessage(
                    'You left something behind 👕',
                    message,
                    to=[user.email]
                )
                email.content_subtype = 'html'
                email.send()
                sent += 1
            except Exception as e:
                self.stderr.write(f'Failed for {user.email}: {e}')

        self.stdout.write(f'Sent {sent} reminder(s).')
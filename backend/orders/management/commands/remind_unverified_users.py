from django.core.management.base import BaseCommand
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from accounts.models import Account
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Nudge users who signed up but never verified their email'

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(hours=24)
        targets = Account.objects.filter(
            is_active=False,
            is_admin=False,
            date_joined__lte=cutoff,
        )

        sent = 0
        for user in targets:
            try:
                message = render_to_string(
                    'orders/emails/remind_verify_email.html',
                    {'user': user}
                )
                email = EmailMessage(
                    'Confirm your GoodNews Merch account',
                    message,
                    to=[user.email]
                )
                email.content_subtype = 'html'
                email.send()
                sent += 1
            except Exception as e:
                self.stderr.write(f'Failed for {user.email}: {e}')

        self.stdout.write(f'Sent {sent} verification nudge(s).')
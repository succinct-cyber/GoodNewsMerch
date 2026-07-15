from django.core.management.base import BaseCommand
from accounts.models import Account


class Command(BaseCommand):
    help = 'Create superuser automatically from env vars'

    def handle(self, *args, **kwargs):
        from django.conf import settings
        import os

        email    = os.environ.get('SUPERUSER_EMAIL')
        password = os.environ.get('SUPERUSER_PASSWORD')
        username = os.environ.get('SUPERUSER_USERNAME', 'admin')

        if not email or not password:
            self.stderr.write('Set SUPERUSER_EMAIL and SUPERUSER_PASSWORD env vars.')
            return

        if Account.objects.filter(email=email).exists():
            self.stdout.write('Superuser already exists.')
            return

        Account.objects.create_superuser(
            first_name='GoodNews',
            last_name='Merch',
            email=email,
            username=username,
            password=password,
        )
        self.stdout.write(f'Superuser {email} created.')
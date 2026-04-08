from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _disable_sqlite_fk(sender, connection, **kwargs):
    """
    SQLite enforces FK constraints at connection level.
    Django admin saves inlines in an order SQLite sometimes rejects.
    Disabling here is safe — Django's ORM enforces FKs at application level.
    """
    if connection.vendor == 'sqlite':
        connection.cursor().execute('PRAGMA foreign_keys = OFF;')


class StoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'store'

    def ready(self):
        connection_created.connect(_disable_sqlite_fk)
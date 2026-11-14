from django.apps import AppConfig
from django.db import connection
from django.db.models.signals import post_migrate

def lock_down_tables(sender, **kwargs):
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cur:
        cur.execute("""...the same do $$ ... end $$; block you pasted...""")
        

class AccountsConfig(AppConfig):
    name = "accounts"

    def ready(self):
        import accounts.signals
        post_migrate.connect(lock_down_tables, sender=self)
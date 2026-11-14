from django.apps import AppConfig
from django.db import connection
from django.db.models.signals import post_migrate

LOCK_DOWN_SQL = """
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
"""

def lock_down_tables(sender, **kwargs):
    if connection.vendor != "postgresql":      # SQLite in dev has no RLS
        return
    with connection.cursor() as cur:
        cur.execute(LOCK_DOWN_SQL)             # idempotent: safe to re-run on every migrate

class AccountsConfig(AppConfig):
    name = "accounts"

    def ready(self):
        # keep any signal lines you already had here
        post_migrate.connect(lock_down_tables, sender=self)
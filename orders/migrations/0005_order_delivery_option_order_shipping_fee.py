from django.db import migrations, models

def clean_orphaned_admin_log(apps, schema_editor):
    if schema_editor.connection.vendor != 'sqlite':
        return

    with schema_editor.connection.cursor() as c:
        c.execute("PRAGMA foreign_keys = OFF")
        c.execute(
            "DELETE FROM django_admin_log "
            "WHERE user_id NOT IN (SELECT id FROM accounts_account)"
        )
        c.execute("PRAGMA foreign_keys = ON")


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_order_tax'),
    ]

    operations = [
        migrations.RunPython(clean_orphaned_admin_log, migrations.RunPython.noop),

        migrations.AddField(
            model_name='order',
            name='delivery_option',
            field=models.CharField(choices=[('pickup', 'Pick Up Station'), ('lagos', 'Door Delivery (Lagos)'), ('outside_lagos', 'Park Delivery (Outside Lagos)')], default='pickup', max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_fee',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
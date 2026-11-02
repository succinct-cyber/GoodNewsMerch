import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0003_productgallery_reviewrating'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productgallery',
            name='product',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='store.product',
            ),
        ),
        migrations.AlterField(
            model_name='productgallery',
            name='image',
            field=models.ImageField(blank=True, max_length=255, upload_to='store/products'),
        ),
    ]

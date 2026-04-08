import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0004_productgallery_fk_and_blank_image'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productgallery',
            name='image',
            field=models.ImageField(
                blank=True,
                max_length=255,
                null=True,
                upload_to='store/products',
            ),
        ),
    ]

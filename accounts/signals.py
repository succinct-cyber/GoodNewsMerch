from django.db.models.signals import pre_delete
from django.dispatch import receiver
from .models import Account, UserProfile

@receiver(pre_delete, sender=Account)
def delete_user_profile(sender, instance, **kwargs):
    try:
        profile = instance.userprofile
        # Only delete if it actually exists in the database
        if profile.pk is not None:
            profile.delete()
    except UserProfile.DoesNotExist:
        pass
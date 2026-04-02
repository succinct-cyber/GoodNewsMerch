from django.db.models.signals import pre_delete
from django.dispatch import receiver
from .models import Account, UserProfile

@receiver(pre_delete, sender=Account)
def delete_user_profile(sender, instance, **kwargs):
    try:
        instance.userprofile.delete()
    except UserProfile.DoesNotExist:
        pass
# accounts/security.py
import requests
from django.conf import settings

def turnstile_ok(token):
    if not token:                 
        return False
    try:
        r = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.TURNSTILE_SECRET, "response": token},
            timeout=5,                 # never hang a worker on a third party
        )
        return r.json().get("success") is True
    except (requests.RequestException, ValueError):
        return False                   # fail closed
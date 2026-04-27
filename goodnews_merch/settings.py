from pathlib import Path

import dj_database_url
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)

# Railway: include subdomain wildcards via leading dot. Add your custom domain explicitly in env.
ALLOWED_HOSTS = [
    h.strip()
    for h in config(
        'ALLOWED_HOSTS',
        default='.railway.app,.up.railway.app,localhost,127.0.0.1',
    ).split(',')
    if h.strip()
]

# Django does not accept wildcards like https://*.railway.app — merge env + auto https origins for concrete hosts
_csrf_from_env = config('CSRF_TRUSTED_ORIGINS', default='')
CSRF_TRUSTED_ORIGINS = [
    'https://goodnewsmerch.store',
    'https://www.goodnewsmerch.store',
] + [
    o.strip() for o in _csrf_from_env.split(',')
    if o.strip()
]

for _host in ALLOWED_HOSTS:
    if _host.startswith('.'):
        continue
    _origin = f'https://{_host}'
    if _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)
    _origin_http = f'http://{_host}'
    if DEBUG and _origin_http not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin_http)

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    # Railway terminates TLS; forward proto/host from the edge proxy
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'category',
    'store',
    'cart',
    'orders',
    'accounts',
    'anymail',
    'api',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
}

# Cloudinary only when all credentials are set (avoids boot/collectstatic crash in prod without keys)
_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='')
_CLOUD_KEY = config('CLOUDINARY_API_KEY', default='')
_CLOUD_SECRET = config('CLOUDINARY_API_SECRET', default='')
USE_CLOUDINARY = (not DEBUG) and bool(_CLOUD_NAME and _CLOUD_KEY and _CLOUD_SECRET)

if USE_CLOUDINARY:
    INSTALLED_APPS += ['cloudinary_storage', 'cloudinary']

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'goodnews_merch.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'cart.context_processors.counter',
            ],
        },
    },
]

WSGI_APPLICATION = 'goodnews_merch.wsgi.application'

_raw_database_url = config('DATABASE_URL', default='')
# Hosting envs sometimes inject quotes/whitespace or an accidental trailing "\".
_database_url = (
    _raw_database_url.strip().strip('"').strip("'").rstrip('\\').strip()
    if isinstance(_raw_database_url, str)
    else ''
)

def _sqlite_db():
    return {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


if _database_url and '://' in _database_url:
    try:
        DATABASES = {
            'default': dj_database_url.parse(
                _database_url,
                conn_max_age=600,
                ssl_require=not DEBUG,
            )
        }
    except Exception as exc:
        # In production we want a hard fail with a useful error message.
        if not DEBUG:
            raise ValueError(
                f"Invalid DATABASE_URL value. Got: {_raw_database_url!r} (sanitized to {_database_url!r}). "
                "Expected e.g. postgres://user:pass@host:port/dbname"
            ) from exc
        DATABASES = _sqlite_db()
else:
    DATABASES = _sqlite_db()

EMAIL_BACKEND = 'anymail.backends.brevo.EmailBackend'
ANYMAIL = {
    'BREVO_API_KEY': config('BREVO_API_KEY', default=''),
}
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='info@goodnewsmerch.store')

PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='')
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')

FLUTTERWAVE_PUBLIC_KEY = config('FLUTTERWAVE_PUBLIC_KEY', default='')
FLUTTERWAVE_SECRET_KEY = config('FLUTTERWAVE_SECRET_KEY', default='')

# ── Static ────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# ── Media ─────────────────────────────────────────────────────
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

if USE_CLOUDINARY:
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': _CLOUD_NAME,
        'API_KEY': _CLOUD_KEY,
        'API_SECRET': _CLOUD_SECRET,
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

AUTH_USER_MODEL = 'accounts.Account'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Lagos'
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

from django.contrib.messages import constants as messages

MESSAGE_TAGS = {messages.ERROR: 'danger'}

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "insecure-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"
ALLOWED_HOSTS = [host for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",") if host]

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if origin.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",
    "shortener",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get(
            "DATABASE_URL",
            "postgres://postgres:postgres@db:5432/postgres",
        ),
        conn_max_age=600,
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", 30))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", 7))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

REDIRECT_BASE_URL = os.environ.get("REDIRECT_BASE_URL", "http://localhost:8000")

RATE_LIMIT_REDIS_URL = os.environ.get("RATE_LIMIT_REDIS_URL", os.environ.get("REDIS_URL", "redis://redis:6379/0"))
BULK_RATE_LIMIT = int(os.environ.get("BULK_RATE_LIMIT", 10))
BULK_RATE_PERIOD_SECONDS = int(os.environ.get("BULK_RATE_PERIOD_SECONDS", 60))
MAX_BULK_LINKS = int(os.environ.get("MAX_BULK_LINKS", 200))
DEFAULT_CODE_LENGTH = int(os.environ.get("DEFAULT_CODE_LENGTH", 7))
MIN_CODE_LENGTH = int(os.environ.get("MIN_CODE_LENGTH", 4))
MAX_CODE_LENGTH = int(os.environ.get("MAX_CODE_LENGTH_LIMIT", 32))

DENYLIST_SCHEMES = {
    scheme.strip().lower()
    for scheme in os.environ.get(
        "DENYLIST_SCHEMES",
        "javascript,data,file,about,chrome",
    ).split(",")
    if scheme.strip()
}

ALLOWED_URL_SCHEMES = {"http", "https"}

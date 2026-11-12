"""
Configuration Django — Plateforme d'inscription au Club d'Entrepreneuriat (CIAT / ISEP Amadou Trawaré).
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _lire_env(fichier):
    """Lit backend/.env (CLE=valeur) sans dépendance externe.

    Les valeurs ne sont PAS copiées dans os.environ : un rechargement « à chaud » du serveur
    (uWSGI sur PythonAnywhere) conserve os.environ, et d'anciennes valeurs masqueraient alors
    les nouvelles. Le fichier .env est relu à chaque démarrage et fait foi.
    """
    valeurs = {}
    if fichier.exists():
        for ligne in fichier.read_text(encoding="utf-8").splitlines():
            ligne = ligne.strip()
            if not ligne or ligne.startswith("#") or "=" not in ligne:
                continue
            cle, valeur = ligne.split("=", 1)
            valeurs[cle.strip()] = valeur.strip().strip('"').strip("'")
    return valeurs


_FICHIER_ENV = _lire_env(BASE_DIR / ".env")


def _env(nom, defaut=None):
    """Valeur de configuration : backend/.env d'abord, puis variable d'environnement, puis défaut."""
    if nom in _FICHIER_ENV:
        return _FICHIER_ENV[nom]
    return os.environ.get(nom, defaut)

def _liste(nom, defaut=""):
    return [x.strip() for x in _env(nom, defaut).split(",") if x.strip()]


CLE_DEV = "dev-insecure-change-me-ciat-club-entrepreneuriat"
SECRET_KEY = _env("DJANGO_SECRET_KEY", CLE_DEV)
DEBUG = _env("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = _liste("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

if not DEBUG and (SECRET_KEY == CLE_DEV or len(SECRET_KEY) < 40):
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured("En production (DJANGO_DEBUG=0), définissez une DJANGO_SECRET_KEY longue et secrète.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    # Application
    "inscriptions",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": _env("DJANGO_DB_PATH", str(BASE_DIR / "db.sqlite3")),
        # Attend jusqu'à 20 s si la base est occupée au lieu d'échouer (pics d'inscriptions).
        "OPTIONS": {"timeout": 20},
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Django REST Framework ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAdminUser",
    ],
    # Limites PAR ADRESSE IP. Elles sont larges car tous les étudiants connectés au Wi-Fi
    # de l'ISEP partagent la même adresse IP publique. La vraie protection contre le
    # spam d'e-mails est la limite PAR ADRESSE E-MAIL (voir CodeVerification.MAX_CODES_PAR_HEURE).
    "DEFAULT_THROTTLE_RATES": {
        "inscription": _env("LIMITE_INSCRIPTION", "300/hour"),
        "suivi": _env("LIMITE_SUIVI", "300/minute"),
        "recuperation_demande": _env("LIMITE_RECUP_DEMANDE", "60/hour"),
        "recuperation_verification": _env("LIMITE_RECUP_VERIF", "120/minute"),
    },
    # Derrière le serveur de PythonAnywhere, l'IP du visiteur est dans X-Forwarded-For :
    # NUM_PROXIES=1 permet de lire la vraie IP au lieu de celle du proxy.
    "NUM_PROXIES": int(_env("DJANGO_NUM_PROXIES")) if _env("DJANGO_NUM_PROXIES") else None,
}
if not DEBUG:
    # En production, l'API ne renvoie que du JSON (pas d'interface navigable DRF).
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ["rest_framework.renderers.JSONRenderer"]

# --- CORS : origines autorisées à appeler l'API (frontend Vite en local, Vercel en production) ---
CORS_ALLOWED_ORIGINS = _liste("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CSRF_TRUSTED_ORIGINS = _liste("CSRF_TRUSTED_ORIGINS")

# --- Sécurité en production (HTTPS fourni par PythonAnywhere) ---
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = _env("DJANGO_SSL_REDIRECT", "1") == "1"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7  # une semaine : la durée de la campagne
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
    X_FRAME_OPTIONS = "DENY"

# Erreurs serveur visibles dans le « error log » de PythonAnywhere.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}

# Admin Django
ADMIN_SITE_HEADER = "CIAT — Club d'Entrepreneuriat"

# --- E-mails ---
# Par défaut (développement), les e-mails s'affichent dans le terminal de `runserver`.
# Pour un envoi réel (ex. Gmail) : EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# + EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD (mot de passe d'application).
EMAIL_HOST = _env("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(_env("EMAIL_PORT", "587"))
EMAIL_USE_TLS = _env("EMAIL_USE_TLS", "1") == "1"
EMAIL_HOST_USER = _env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = _env("EMAIL_HOST_PASSWORD", "").replace(" ", "")
# Envoi SMTP réel dès qu'un mot de passe d'application est fourni ; sinon, affichage dans le terminal.
EMAIL_BACKEND = _env(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend"
    if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
    else "django.core.mail.backends.console.EmailBackend",
)
EMAIL_TIMEOUT = 10  # ne pas bloquer une requête trop longtemps si Gmail est lent
DEFAULT_FROM_EMAIL = _env(
    "DEFAULT_FROM_EMAIL", f"Club d'Entrepreneuriat CIAT <{EMAIL_HOST_USER or 'no-reply@ciat.local'}>"
)

# Adresse publique du site React (liens « Suivre mon dossier » dans les e-mails).
FRONTEND_URL = _env("FRONTEND_URL", "http://localhost:5173")

# Clôture des inscriptions (heure de Dakar). Format ISO 8601.
DATE_LIMITE_INSCRIPTION = _env("DATE_LIMITE_INSCRIPTION", "2026-11-14T23:59:59+00:00")

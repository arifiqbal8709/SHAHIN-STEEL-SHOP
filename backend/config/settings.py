import os
from pathlib import Path
from dotenv import load_dotenv

# Try importing pymysql and installing as MySQLdb if available
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-shahin-steel-luxury-showroom-secret-key-2026')
DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
    
    # Shahin Furniture Shop App
    'shop_api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ─── DATABASE CONFIGURATION (Cloud DATABASE_URL, MySQL, or local SQLite fallback) ─────────
import urllib.parse

DATABASE_URL = os.getenv('DATABASE_URL')
DB_ENGINE = os.getenv('DB_ENGINE', 'mysql')
DB_NAME = os.getenv('DB_NAME', 'shahin_furniture_db')
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
DB_PORT = os.getenv('DB_PORT', '3306')

if DATABASE_URL:
    # Universal Cloud Database Connection String (Neon, Supabase, Render, Railway, Aiven)
    parsed = urllib.parse.urlparse(DATABASE_URL)
    is_postgres = 'postgres' in parsed.scheme
    query_params = urllib.parse.parse_qs(parsed.query)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql' if is_postgres else 'django.db.backends.mysql',
            'NAME': parsed.path.lstrip('/'),
            'USER': parsed.username or '',
            'PASSWORD': urllib.parse.unquote(parsed.password or ''),
            'HOST': parsed.hostname or '127.0.0.1',
            'PORT': str(parsed.port or (5432 if is_postgres else 3306)),
        }
    }
    if is_postgres:
        sslmode = query_params.get('sslmode', [None])[0]
        if sslmode:
            DATABASES['default']['OPTIONS'] = {'sslmode': sslmode}
    else:
        DATABASES['default']['OPTIONS'] = {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
elif DB_ENGINE == 'mysql' and os.getenv('USE_MYSQL', 'False') == 'True':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            }
        }
    }
else:
    # High-performance default database for instant local run & development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'OPTIONS': {
                'timeout': 30,
            }
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── REST FRAMEWORK CONFIGURATION ───────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', # Public API with custom view-level permission checks
    ],
    'DEFAULT_PAGINATION_CLASS': None, # Returns full list for responsive dashboard tables
}

# ─── CORS CONFIGURATION ─────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['*']

"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()

# Auto-apply database migrations on cloud startup (Vercel Serverless)
try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
except Exception as e:
    print('Startup migration note:', e)

# Expose WSGI callable as `app` for Vercel Python runtime compatibility
app = application

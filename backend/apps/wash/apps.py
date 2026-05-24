from django.apps import AppConfig


class WashConfig(AppConfig):
    # verbose name in spanish
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.wash'
    verbose_name = 'Lavado de Autos'

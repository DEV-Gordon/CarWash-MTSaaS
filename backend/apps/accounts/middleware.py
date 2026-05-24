from django.conf import settings
from rest_framework.response import Response
from rest_framework import status
import json


class SubscriptionMiddleware:
    """
    Block API calls from businesses with expired/suspended subscriptions.
    Exempt paths defined in settings.SUBSCRIPTION_EXEMPT_PATHS.
    """

    def __init__(self, get_response):
        # One-time configuration and initialization.
        self.get_response = get_response
        self.exempt_paths = getattr(settings, 'SUBSCRIPTION_EXEMPT_PATHS', [])

    def __call__(self, request):
        # Check if the request path is exempt from subscription checks. If it is, allow the request to proceed without checking the subscription status.
        if self._is_exempt(request.path):
            return self.get_response(request)

        user = getattr(request, 'user', None)
        if user and user.is_authenticated and not user.is_superuser:
            business = getattr(user, 'business', None)
            if business:
                sub = getattr(business, 'subscription', None)
                if sub:
                    sub.check_and_update_status()
                    if sub.status in ('expired', 'suspended'):
                        return self._subscription_expired_response(sub.status)
                else:
                    return self._subscription_expired_response('none')

        return self.get_response(request)

    def _is_exempt(self, path):
        return any(path.startswith(p) for p in self.exempt_paths)

    def _subscription_expired_response(self, status_val):
        from django.http import JsonResponse
        # Map subscription status to user-friendly messages. The 'none' status indicates that the user does not have an active subscription, while 'expired' and 'suspended' indicate specific issues with the subscription that require attention.
        msg = {
            'expired': 'Tu suscripción ha vencido. Por favor, renuévala para continuar.',
            'suspended': 'Tu suscripción ha sido suspendida. Contacta a soporte.',
            'none': 'No tienes una suscripción activa.',
        }.get(status_val, 'Suscripción inactiva.')
        return JsonResponse(
            {'detail': msg, 'code': 'subscription_expired', 'status': status_val},
            status=402
        )

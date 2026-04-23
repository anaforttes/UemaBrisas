from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class UpdateLastAccessMiddleware:
    """
    Atualiza last_access no banco a cada request autenticado via JWT.
    Ignora requests sem token ou com token inválido silenciosamente.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self._try_update_last_access(request)
        return self.get_response(request)

    def _try_update_last_access(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return
        try:
            jwt_auth = JWTAuthentication()
            result = jwt_auth.authenticate(request)
            if result is None:
                return
            user, _ = result
            # Só grava se passou mais de 60 s desde o último registro (evita writes excessivos)
            if user.last_access is None or (timezone.now() - user.last_access).total_seconds() > 60:
                user.last_access = timezone.now()
                user.save(update_fields=['last_access'])
        except (AuthenticationFailed, Exception):
            pass

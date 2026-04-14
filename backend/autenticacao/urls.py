from django.urls import path
from .views import login, google_login, request_password_reset, confirm_password_reset, cadastro

urlpatterns = [
    path('login/', login, name='login'),
    path('login-google/', google_login, name='login_google'),
    path('cadastro/', cadastro, name='cadastro'),
    path('esqueci-senha/', request_password_reset, name='solicitar_recuperacao_senha'),
    path('redefinir-senha/', confirm_password_reset, name='redefinir_senha'),
]

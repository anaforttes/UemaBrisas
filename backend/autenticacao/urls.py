from django.urls import path
from .views import (
    login,
    google_login,
    solicitar_recuperacao_senha,
    redefinir_senha,
    cadastro,
    CustomUserList
)

urlpatterns = [
    path('login/', login, name='login'),
    path('login-google/', google_login, name='login_google'),
    path('cadastro/', cadastro, name='cadastro'),

    # 👇 ROTA CORRETA DE USUÁRIOS
    path('usuarios/', CustomUserList.as_view(), name='usuarios'),

    path('esqueci-senha/', solicitar_recuperacao_senha, name='esqueci_senha'),
    path('redefinir-senha/', redefinir_senha, name='redefinir_senha'),
]
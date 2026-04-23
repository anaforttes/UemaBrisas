from django.urls import path
from .views import (
    login,
    google_login,
    solicitar_recuperacao_senha,
    redefinir_senha,
    cadastro,
    CustomUserList,
    CustomUserDetail,
)

urlpatterns = [
    path('login/',          login,                       name='login'),
    path('login-google/',   google_login,                name='login_google'),
    path('cadastro/',       cadastro,                    name='cadastro'),
    path('usuarios/',       CustomUserList.as_view(),    name='usuarios'),
    path('usuarios/<int:pk>/', CustomUserDetail.as_view(), name='usuario_detail'),
    path('esqueci-senha/',  solicitar_recuperacao_senha, name='esqueci_senha'),
    path('redefinir-senha/', redefinir_senha,            name='redefinir_senha'),
]

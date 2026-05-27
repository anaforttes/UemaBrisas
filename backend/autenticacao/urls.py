from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    login,
    google_login,
    solicitar_recuperacao_senha,
    redefinir_senha,
    cadastro,
    heartbeat,
    logout_status,
    status_stream,
    CustomUserList,
    CustomUserDetail,
    ConviteEquipeView,
    ConviteEquipeDetailView,
    PerfilTemplateView,
    PerfilTemplateDetailView,
)

urlpatterns = [
    path('token/refresh/',        TokenRefreshView.as_view(),  name='token_refresh'),
    path('login/',               login,                       name='login'),
    path('login-google/',        google_login,                name='login_google'),
    path('cadastro/',            cadastro,                    name='cadastro'),
    path('heartbeat/',           heartbeat,                   name='heartbeat'),
    path('logout-status/',       logout_status,               name='logout_status'),
    path('status-stream/',       status_stream,               name='status_stream'),
    path('usuarios/',            CustomUserList.as_view(),    name='usuarios'),
    path('usuarios/<int:pk>/',   CustomUserDetail.as_view(),  name='usuario_detail'),
    path('esqueci-senha/',       solicitar_recuperacao_senha, name='esqueci_senha'),
    path('redefinir-senha/',     redefinir_senha,             name='redefinir_senha'),
    path('convites-equipe/',     ConviteEquipeView.as_view(), name='convites_equipe'),
    path('convites-equipe/<str:token>/', ConviteEquipeDetailView.as_view(), name='convite_equipe_detail'),
    path('perfis-template/',     PerfilTemplateView.as_view(), name='perfis_template'),
    path('perfis-template/<int:pk>/', PerfilTemplateDetailView.as_view(), name='perfil_template_detail'),
]

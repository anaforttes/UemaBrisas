from django.urls import path

from .views import (
    auditoria_view,
    meu_perfil_view,
    niveis_acesso_view,
    permissoes_view,
    usuario_detalhe_view,
    usuarios_pendentes_view,
    usuarios_view,
)


urlpatterns = [
    path('me/', meu_perfil_view, name='controleadmin-meu-perfil'),
    path('niveis-acesso/', niveis_acesso_view, name='controleadmin-niveis-acesso'),
    path('permissoes/', permissoes_view, name='controleadmin-permissoes'),
    path('usuarios/', usuarios_view, name='controleadmin-usuarios'),
    path('usuarios/pendentes/', usuarios_pendentes_view, name='controleadmin-usuarios-pendentes'),
    path('usuarios/<int:user_id>/', usuario_detalhe_view, name='controleadmin-usuario-detalhe'),
    path('auditoria/', auditoria_view, name='controleadmin-auditoria'),
]

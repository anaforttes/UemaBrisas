# Regras de negocio do app permissoes.
from django.contrib.auth.models import User
from .models import PerfilAcesso


def obter_ou_criar_perfil(usuario: User) -> PerfilAcesso:
    perfil, _ = PerfilAcesso.objects.get_or_create(
        usuario=usuario,
        defaults={
            'role': 'Atendente',
            'superusuario': False,
            'admin_municipio': False,
            'profissional_interno': True,
            'usuario_externo': False,
            'visualizar': True,
            'editor': False,
            'comentar': True,
            'aprovar': False,
            'assinar': False,
            'exportar': False,
        }
    )
    return perfil


def obter_permissoes_usuario(user):
    perfil = obter_ou_criar_perfil(user)

    acoes = []

    if perfil.visualizar:
        acoes.append("visualizar")

    if perfil.editor:
        acoes.append("editor")

    if perfil.comentar:
        acoes.append("comentar")

    if perfil.role == "Admin" or perfil.superusuario:
        acoes.append("aprovar")

    if perfil.assinar:
        acoes.append("assinar")

    if perfil.exportar:
        acoes.append("exportar")

    return {
        "roles": [perfil.role],
        "flags": [
            flag for flag, ativo in {
                "superusuario": perfil.superusuario,
                "admin_municipio": perfil.admin_municipio,
                "profissional_interno": perfil.profissional_interno,
                "usuario_externo": perfil.usuario_externo,
            }.items() if ativo
        ],
        "acoes": acoes
    }
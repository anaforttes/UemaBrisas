"""
App permissoes/servicos.py

Este módulo agora é um proxy simples para o controleadmin.
Toda a lógica de permissão foi unificada em controleadmin/servicos.py.
Mantido por compatibilidade com imports existentes.
"""
from autenticacao.models import CustomUser
from controleadmin.servicos import (
    usuario_possui_permissao_codigo,
    usuario_tem_acesso_controleadmin,
    garantir_perfil_usuario,
)


def obter_permissoes_usuario(user: CustomUser) -> dict:
    """
    Retorna as permissões efetivas do usuário via controleadmin.
    Substitui a leitura direta de access_flags e permissions_data.
    """
    if not user or not user.is_authenticated:
        return {'roles': [], 'flags': [], 'acoes': []}

    # Superusuário/staff: acesso total
    if user.is_superuser or user.is_staff:
        return {
            'roles': [user.role or 'Admin'],
            'flags': ['superusuario'],
            'acoes': ['visualizar', 'editor', 'comentar', 'aprovar', 'assinar', 'exportar', 'gerenciar_usuarios'],
        }

    codigos_acoes = ['visualizar', 'editor', 'comentar', 'aprovar', 'assinar', 'exportar', 'gerenciar_usuarios']
    acoes = [c for c in codigos_acoes if usuario_possui_permissao_codigo(user, c)]

    # Nível de acesso via controleadmin
    nivel = None
    try:
        perfil = user.perfil_acesso
        nivel = perfil.nivel_acesso.codigo if perfil.nivel_acesso else None
    except Exception:
        pass

    flags = []
    if usuario_tem_acesso_controleadmin(user):
        flags.append('admin_municipio')

    return {
        'roles':  [user.role] if user.role else [],
        'flags':  flags,
        'nivel':  nivel,
        'acoes':  acoes,
    }

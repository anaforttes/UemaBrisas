# Regras de negocio do app permissoes.
from autenticacao.models import CustomUser


def obter_permissoes_usuario(user: CustomUser) -> dict:
    """
    Retorna roles, flags e acoes do usuario a partir dos campos
    CustomUser.role, CustomUser.access_flags e CustomUser.permissions_data.
    """
    flags_raw = user.access_flags or {}
    perms_raw = user.permissions_data or {}

    superusuario       = flags_raw.get('superusuario', False)
    admin_municipio    = flags_raw.get('adminMunicipio', False)
    prof_interno       = flags_raw.get('profissionalInterno', True)
    usuario_externo    = flags_raw.get('usuarioExterno', False)

    visualizar = perms_raw.get('visualizar', True)
    editor     = perms_raw.get('editor', False)
    comentar   = perms_raw.get('comentar', True)
    assinar    = perms_raw.get('assinar', False)
    exportar   = perms_raw.get('exportar', False)

    acoes = []
    if visualizar:
        acoes.append('visualizar')
    if editor:
        acoes.append('editor')
    if comentar:
        acoes.append('comentar')
    if user.role == 'Admin' or superusuario:
        acoes.append('aprovar')
    if assinar:
        acoes.append('assinar')
    if exportar:
        acoes.append('exportar')

    return {
        'roles': [user.role],
        'flags': [
            flag for flag, ativo in {
                'superusuario':       superusuario,
                'admin_municipio':    admin_municipio,
                'profissional_interno': prof_interno,
                'usuario_externo':    usuario_externo,
            }.items() if ativo
        ],
        'acoes': acoes,
    }

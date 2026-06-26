"""
controleadmin/servicos.py

FONTE ÚNICA de verdade para permissões do sistema.
Todas as verificações de acesso passam por aqui.
"""
from typing import Iterable

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import (
    AuditoriaAdministrativa,
    NivelAcesso,
    PerfilAcessoUsuario,
    PermissaoSistema,
    UsuarioPermissaoExtra,
)

User = get_user_model()

# Códigos de nível que concedem acesso ao painel administrativo
CODIGOS_ADMIN = {'superadmin', 'admin_municipio', 'administrador', 'gerente'}

# ── Mapa de permissões padrão por nível ──────────────────────────────────────
# Usado como fallback quando o banco não tem as permissões cadastradas ainda.
PERMISSOES_PADRAO_POR_NIVEL = {
    'visualizador':  {'visualizar', 'comentar'},
    'colaborador':   {'visualizar', 'comentar', 'exportar'},
    'editor':        {'visualizar', 'comentar', 'exportar', 'editor'},
    'aprovador':     {'visualizar', 'comentar', 'exportar', 'editor', 'aprovar', 'assinar'},
    'gerente':       {'visualizar', 'comentar', 'exportar', 'editor', 'aprovar', 'assinar', 'gerenciar_usuarios'},
    'administrador': {'visualizar', 'comentar', 'exportar', 'editor', 'aprovar', 'assinar', 'gerenciar_usuarios'},
}


def garantir_perfil_usuario(user: User) -> PerfilAcessoUsuario:
    """
    Garante que o usuário tem um PerfilAcessoUsuario.
    Cria automaticamente como 'pendente' se não existir.
    """
    perfil, _ = PerfilAcessoUsuario.objects.get_or_create(
        user=user,
        defaults={'status_acesso': PerfilAcessoUsuario.StatusAcesso.PENDENTE},
    )
    return perfil


def sincronizar_perfis_usuarios() -> None:
    """Garante que todos os usuários têm um perfil. Útil em management commands."""
    for user in User.objects.all().only('id'):
        garantir_perfil_usuario(user)


def usuario_tem_acesso_controleadmin(user: User) -> bool:
    """Verifica se o usuário pode acessar o painel administrativo."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    perfil = (
        PerfilAcessoUsuario.objects
        .select_related('nivel_acesso')
        .filter(
            user=user,
            status_acesso=PerfilAcessoUsuario.StatusAcesso.ATIVO,
            nivel_acesso__codigo__in=CODIGOS_ADMIN,
        )
        .first()
    )
    return perfil is not None


def usuario_possui_permissao_codigo(user: User, codigo_permissao: str) -> bool:
    """
    Verifica se o usuário possui uma permissão específica.

    Ordem de resolução:
    1. Superusuário/staff → sempre True
    2. Perfil não ativo (pendente/bloqueado/inativo) → sempre False
    3. UsuarioPermissaoExtra → override individual (grant ou revoke)
    4. NivelAcesso → permissões padrão do nível no banco
    5. Fallback → PERMISSOES_PADRAO_POR_NIVEL (quando banco ainda não tem dados)
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True

    perfil = (
        PerfilAcessoUsuario.objects
        .select_related('nivel_acesso')
        .prefetch_related(
            'permissoes_extras__permissao',
            'nivel_acesso__permissoes_padrao__permissao',
        )
        .filter(user=user, status_acesso=PerfilAcessoUsuario.StatusAcesso.ATIVO)
        .first()
    )

    if not perfil:
        return False

    # 3. Override individual
    for extra in perfil.permissoes_extras.all():
        if extra.permissao and extra.permissao.codigo == codigo_permissao:
            return extra.permitido

    # 4. Permissões do nível no banco
    if perfil.nivel_acesso:
        tem_no_banco = any(
            item.permissao and item.permissao.codigo == codigo_permissao
            for item in perfil.nivel_acesso.permissoes_padrao.all()
        )
        if tem_no_banco:
            return True

        # 5. Fallback: mapa em memória (para quando o banco ainda não foi populado)
        permissoes_fallback = PERMISSOES_PADRAO_POR_NIVEL.get(perfil.nivel_acesso.codigo, set())
        return codigo_permissao in permissoes_fallback

    return False


def listar_usuarios_por_status(status_acesso: str | None = None):
    qs = (
        PerfilAcessoUsuario.objects
        .select_related('user', 'nivel_acesso', 'aprovado_por')
        .prefetch_related('permissoes_extras__permissao')
    )
    if status_acesso:
        qs = qs.filter(status_acesso=status_acesso)
    return qs.order_by('user__email')


def obter_perfil_completo(user: User) -> PerfilAcessoUsuario:
    """Garante o perfil do usuário e o recarrega com os relacionamentos prontos."""
    perfil = garantir_perfil_usuario(user)
    return (
        PerfilAcessoUsuario.objects
        .select_related('user', 'nivel_acesso', 'aprovado_por')
        .prefetch_related('permissoes_extras__permissao')
        .get(pk=perfil.pk)
    )


def listar_auditoria(limite: int = 50):
    limite = min(limite, 200)
    return (
        AuditoriaAdministrativa.objects
        .select_related('usuario_alvo', 'administrador')[:limite]
    )


@transaction.atomic
def atualizar_perfil_usuario(
    *,
    usuario_alvo: User,
    administrador: User,
    dados: dict,
    ip: str | None = None,
) -> PerfilAcessoUsuario:
    """
    Atualiza o perfil de acesso de um usuário.
    Chamado apenas por administradores via controleadmin/views.py.
    """
    perfil       = garantir_perfil_usuario(usuario_alvo)
    nivel_acesso = dados.get('nivel_acesso_id')
    status_acesso = dados.get('status_acesso', perfil.status_acesso)

    if nivel_acesso is not None:
        perfil.nivel_acesso = nivel_acesso
    if 'municipio' in dados:
        perfil.municipio = dados.get('municipio', '')
    if 'setor' in dados:
        perfil.setor = dados.get('setor', '')
    if 'escopo_tipo' in dados:
        perfil.escopo_tipo = dados['escopo_tipo']
    if 'observacoes' in dados:
        perfil.observacoes = dados.get('observacoes', '')

    perfil.status_acesso = status_acesso

    if status_acesso == PerfilAcessoUsuario.StatusAcesso.ATIVO:
        perfil.aprovado_por = administrador
        perfil.aprovado_em  = timezone.now()

    perfil.save()

    if 'permissoes_extras' in dados:
        _atualizar_permissoes_extras(perfil, dados['permissoes_extras'])

    AuditoriaAdministrativa.objects.create(
        usuario_alvo=usuario_alvo,
        administrador=administrador,
        acao='perfil_acesso_atualizado',
        detalhes={
            'nivel_acesso_id': perfil.nivel_acesso_id,
            'status_acesso':   perfil.status_acesso,
            'municipio':       perfil.municipio,
            'setor':           perfil.setor,
            'escopo_tipo':     perfil.escopo_tipo,
        },
        ip=ip,
    )

    return (
        PerfilAcessoUsuario.objects
        .select_related('user', 'nivel_acesso', 'aprovado_por')
        .prefetch_related('permissoes_extras__permissao')
        .get(pk=perfil.pk)
    )


def _atualizar_permissoes_extras(
    perfil: PerfilAcessoUsuario,
    permissoes_extras: Iterable[dict],
) -> None:
    UsuarioPermissaoExtra.objects.filter(perfil_acesso_usuario=perfil).delete()
    novas = []
    for item in permissoes_extras:
        permissao = item['permissao_id']
        if not isinstance(permissao, PermissaoSistema):
            permissao = PermissaoSistema.objects.get(pk=permissao)
        novas.append(UsuarioPermissaoExtra(
            perfil_acesso_usuario=perfil,
            permissao=permissao,
            permitido=item.get('permitido', True),
            origem=item.get('origem', 'manual') or 'manual',
        ))
    if novas:
        UsuarioPermissaoExtra.objects.bulk_create(novas)


def listar_niveis_acesso():
    return NivelAcesso.objects.filter(ativo=True).prefetch_related('permissoes_padrao__permissao')


def listar_permissoes():
    return PermissaoSistema.objects.filter(ativo=True).order_by('modulo', 'nome')

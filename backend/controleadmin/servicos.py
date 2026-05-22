from typing import Iterable

from django.contrib.auth import get_user_model
User = get_user_model()
from django.db import transaction
from django.utils import timezone

from .models import (
    AuditoriaAdministrativa,
    NivelAcesso,
    PerfilAcessoUsuario,
    PermissaoSistema,
    UsuarioPermissaoExtra,
)


CODIGOS_CONTROLE_ADMIN = {'superadmin', 'admin_municipio'}


def garantir_perfil_usuario(user: User) -> PerfilAcessoUsuario:
    perfil, _ = PerfilAcessoUsuario.objects.get_or_create(
        user=user,
        defaults={'status_acesso': PerfilAcessoUsuario.StatusAcesso.PENDENTE},
    )
    return perfil


def sincronizar_perfis_usuarios() -> None:
    for user in User.objects.all().only('id'):
        garantir_perfil_usuario(user)


def usuario_tem_acesso_controleadmin(user: User) -> bool:
    if not user.is_authenticated:
        return False

    if user.is_superuser or user.is_staff:
        return True

    perfil = (
        PerfilAcessoUsuario.objects.select_related('nivel_acesso')
        .filter(
            user=user,
            status_acesso=PerfilAcessoUsuario.StatusAcesso.ATIVO,
            nivel_acesso__codigo__in=CODIGOS_CONTROLE_ADMIN,
        )
        .first()
    )
    return perfil is not None


def usuario_possui_permissao_codigo(user: User, codigo_permissao: str) -> bool:
    if not user.is_authenticated:
        return False

    if user.is_superuser or user.is_staff:
        return True

    perfil = (
        PerfilAcessoUsuario.objects.select_related('nivel_acesso')
        .prefetch_related('permissoes_extras__permissao', 'nivel_acesso__permissoes_padrao__permissao')
        .filter(user=user, status_acesso=PerfilAcessoUsuario.StatusAcesso.ATIVO)
        .first()
    )
    if not perfil:
        return False

    permissao_extra = next(
        (
            item
            for item in perfil.permissoes_extras.all()
            if item.permissao and item.permissao.codigo == codigo_permissao
        ),
        None,
    )
    if permissao_extra is not None:
        return permissao_extra.permitido

    if not perfil.nivel_acesso:
        return False

    return any(
        item.permissao and item.permissao.codigo == codigo_permissao
        for item in perfil.nivel_acesso.permissoes_padrao.all()
    )


def listar_usuarios_por_status(status_acesso: str | None = None):
    queryset = PerfilAcessoUsuario.objects.select_related('user', 'nivel_acesso', 'aprovado_por').prefetch_related(
        'permissoes_extras__permissao'
    )
    if status_acesso:
        queryset = queryset.filter(status_acesso=status_acesso)
    return queryset.order_by('user__email')


@transaction.atomic
def atualizar_perfil_usuario(
    *,
    usuario_alvo: User,
    administrador: User,
    dados: dict,
    ip: str | None = None,
) -> PerfilAcessoUsuario:
    perfil = garantir_perfil_usuario(usuario_alvo)
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
        perfil.aprovado_em = timezone.now()

    perfil.save()

    if 'permissoes_extras' in dados:
        _atualizar_permissoes_extras(perfil, dados['permissoes_extras'])

    AuditoriaAdministrativa.objects.create(
        usuario_alvo=usuario_alvo,
        administrador=administrador,
        acao='perfil_acesso_atualizado',
        detalhes={
            'nivel_acesso_id': perfil.nivel_acesso_id,
            'status_acesso': perfil.status_acesso,
            'municipio': perfil.municipio,
            'setor': perfil.setor,
            'escopo_tipo': perfil.escopo_tipo,
        },
        ip=ip,
    )

    return (
        PerfilAcessoUsuario.objects.select_related('user', 'nivel_acesso', 'aprovado_por')
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
        if isinstance(permissao, PermissaoSistema):
            permissao_obj = permissao
        else:
            permissao_obj = PermissaoSistema.objects.get(pk=permissao)
        novas.append(
            UsuarioPermissaoExtra(
                perfil_acesso_usuario=perfil,
                permissao=permissao_obj,
                permitido=item.get('permitido', True),
                origem=item.get('origem', 'manual') or 'manual',
            )
        )

    if novas:
        UsuarioPermissaoExtra.objects.bulk_create(novas)


def listar_niveis_acesso():
    return NivelAcesso.objects.filter(ativo=True).prefetch_related('permissoes_padrao__permissao')


def listar_permissoes():
    return PermissaoSistema.objects.filter(ativo=True).order_by('modulo', 'nome')

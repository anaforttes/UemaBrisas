from django.contrib.auth import get_user_model
User = get_user_model()
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializadores import (
    AtualizarPerfilAcessoSerializador,
    AuditoriaAdministrativaSerializador,
    NivelAcessoSerializador,
    PerfilAcessoUsuarioSerializador,
    PermissaoSistemaSerializador,
)
from .models import AuditoriaAdministrativa, PerfilAcessoUsuario
from .servicos import (
    atualizar_perfil_usuario,
    garantir_perfil_usuario,
    listar_niveis_acesso,
    listar_permissoes,
    listar_usuarios_por_status,
    usuario_tem_acesso_controleadmin,
)


def _resposta_sem_permissao():
    return Response(
        {'detail': 'Você não possui permissão para acessar o controle administrativo.'},
        status=status.HTTP_403_FORBIDDEN,
    )


def _extrair_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meu_perfil_view(request):
    perfil = garantir_perfil_usuario(request.user)
    perfil = (
        PerfilAcessoUsuario.objects.select_related('user', 'nivel_acesso', 'aprovado_por')
        .prefetch_related('permissoes_extras__permissao')
        .get(pk=perfil.pk)
    )
    return Response(PerfilAcessoUsuarioSerializador(perfil).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def niveis_acesso_view(request):
    if not usuario_tem_acesso_controleadmin(request.user):
        return _resposta_sem_permissao()

    serializador = NivelAcessoSerializador(listar_niveis_acesso(), many=True)
    return Response(serializador.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permissoes_view(request):
    if not usuario_tem_acesso_controleadmin(request.user):
        return _resposta_sem_permissao()

    serializador = PermissaoSistemaSerializador(listar_permissoes(), many=True)
    return Response(serializador.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuarios_view(request):
    if not usuario_tem_acesso_controleadmin(request.user):
        return _resposta_sem_permissao()

    status_acesso = request.query_params.get('status')
    perfis = listar_usuarios_por_status(status_acesso)
    serializador = PerfilAcessoUsuarioSerializador(perfis, many=True)
    return Response(serializador.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuarios_pendentes_view(request):
    if not usuario_tem_acesso_controleadmin(request.user):
        return _resposta_sem_permissao()

    perfis = listar_usuarios_por_status(PerfilAcessoUsuario.StatusAcesso.PENDENTE)
    serializador = PerfilAcessoUsuarioSerializador(perfis, many=True)
    return Response(serializador.data)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def usuario_detalhe_view(request, user_id: int):
    if not usuario_tem_acesso_controleadmin(request.user):
        return _resposta_sem_permissao()

    usuario = get_object_or_404(User, pk=user_id)

    if request.method == 'GET':
        perfil = garantir_perfil_usuario(usuario)
        perfil = (
            PerfilAcessoUsuario.objects.select_related('user', 'nivel_acesso', 'aprovado_por')
            .prefetch_related('permissoes_extras__permissao')
            .get(pk=perfil.pk)
        )
        return Response(PerfilAcessoUsuarioSerializador(perfil).data)

    serializador = AtualizarPerfilAcessoSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    perfil = atualizar_perfil_usuario(
        usuario_alvo=usuario,
        administrador=request.user,
        dados=serializador.validated_data,
        ip=_extrair_ip(request),
    )
    return Response(PerfilAcessoUsuarioSerializador(perfil).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auditoria_view(request):
    if not usuario_tem_acesso_controleadmin(request.user):
        return _resposta_sem_permissao()

    limite = min(int(request.query_params.get('limit', 50)), 200)
    logs = AuditoriaAdministrativa.objects.select_related('usuario_alvo', 'administrador')[:limite]
    serializador = AuditoriaAdministrativaSerializador(logs, many=True)
    return Response(serializador.data)

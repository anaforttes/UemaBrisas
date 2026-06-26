import json
import secrets
import time
import threading
from datetime import timedelta
from django.utils import timezone
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import CustomUser, ConviteEquipe, PerfilTemplate
from .sse import sse_register, sse_unregister, sse_broadcast
import logging
import queue

logger = logging.getLogger(__name__)

from .serializadores import (
    LoginSerializador,
    LoginGoogleSerializador,
    RedefinirSenhaSerializador,
    SolicitarRecuperacaoSenhaSerializador,
    CadastroSerializador,
    CustomUserSerializer,
    AtualizarUsuarioSerializer,
)
from .servicos import (
    autenticar_usuario,
    autenticar_com_google,
    redefinir_senha as redefinir_senha_service,
    solicitar_recuperacao_senha as solicitar_recuperacao_senha_service,
    criar_usuario,
    obter_usuario_por_token,
    marcar_online,
    snapshot_status_usuarios,
    listar_usuarios,
    obter_usuario,
    remover_usuario,
    listar_convites_equipe,
    criar_convite_equipe,
    cancelar_convite_equipe,
    listar_perfis_template,
    salvar_perfil_template,
    remover_perfil_template,
)


# ── LOGIN ─────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def login(request):
    request.throttle_scope = 'login'
    serializador = LoginSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = autenticar_usuario(
        serializador.validated_data['email'],
        serializador.validated_data['password'],
    )
    return Response(resposta)


# ── LOGIN GOOGLE ──────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    serializador = LoginGoogleSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = autenticar_com_google(serializador.validated_data['credential'])
    return Response(resposta)


# ── CADASTRO ──────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def cadastro(request):
    request.throttle_scope = 'cadastro'
    serializador = CadastroSerializador(data=request.data)
    if not serializador.is_valid():
        logger.error(f"Erro de validação: {serializador.errors}")
        return Response(serializador.errors, status=400)
    try:
        resposta = criar_usuario(
            serializador.validated_data['email'],
            serializador.validated_data['password'],
            serializador.validated_data['name'],
        )
        try:
            from controleadmin.servicos import garantir_perfil_usuario
            from autenticacao.models import CustomUser
            user = CustomUser.objects.get(email=serializador.validated_data['email'])
            garantir_perfil_usuario(user)
        except Exception:
            pass
        return Response(resposta)
    except Exception as e:
        logger.error(f"Erro ao criar usuário: {str(e)}")
        return Response({'erro': str(e)}, status=400)


# ── ESQUECI / REDEFINIR SENHA ─────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def solicitar_recuperacao_senha(request):
    serializador = SolicitarRecuperacaoSenhaSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = solicitar_recuperacao_senha_service(serializador.validated_data['email'])
    return Response(resposta)


@api_view(['POST'])
@permission_classes([AllowAny])
def redefinir_senha(request):
    serializador = RedefinirSenhaSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = redefinir_senha_service(
        serializador.validated_data['uid'],
        serializador.validated_data['token'],
        serializador.validated_data['new_password'],
    )
    return Response(resposta)


# ── HEARTBEAT ─────────────────────────────────────────────────────────────────
def _autenticar_token_body(request):
    """Extrai o JWT do header ou do body (para sendBeacon) e resolve o usuário."""
    header = request.META.get('HTTP_AUTHORIZATION', '')
    raw = header.removeprefix('Bearer ').strip() if header.startswith('Bearer ') else ''

    if not raw:
        try:
            body = json.loads(request.body or '{}')
            raw = body.get('token', '')
        except Exception:
            pass

    return obter_usuario_por_token(raw)


@api_view(['POST'])
@permission_classes([AllowAny])
def heartbeat(request):
    user = _autenticar_token_body(request)
    if not user:
        return Response({'erro': 'Token inválido.'}, status=401)

    marcar_online(user)
    sse_broadcast('status_update', {'id': user.id, 'status': 'Online'})
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_status(request):
    user = _autenticar_token_body(request)
    if not user:
        return Response({'erro': 'Token inválido.'}, status=401)
    sse_broadcast('status_update', {'id': user.id, 'status': 'Offline'})
    return Response({'ok': True})


# ── SSE STREAM ────────────────────────────────────────────────────────────────
def status_stream(request):
    user_id = 0
    token = (
        request.GET.get('token') or
        request.META.get('HTTP_AUTHORIZATION', '').removeprefix('Bearer ').strip()
    )
    if token:
        try:
            jwt_auth = JWTAuthentication()
            validated = jwt_auth.get_validated_token(
                jwt_auth.get_raw_token(
                    jwt_auth.get_header(request) or
                    type('R', (), {'META': {'HTTP_AUTHORIZATION': f'Bearer {token}'}})().META
                )
            )
            user_id = int(validated['user_id'])
        except Exception:
            pass

    q = sse_register(user_id)

    def event_generator():
        snapshot = snapshot_status_usuarios()
        yield f"event: snapshot\ndata: {json.dumps(snapshot)}\n\n"

        try:
            while True:
                try:
                    msg = q.get(timeout=20)
                    yield msg
                except queue.Empty:
                    yield ': keepalive\n\n'
        finally:
            sse_unregister(user_id, q)

    response = StreamingHttpResponse(event_generator(), content_type='text/event-stream')
    response['Cache-Control']               = 'no-cache'
    response['X-Accel-Buffering']           = 'no'
    response['Access-Control-Allow-Origin'] = '*'
    return response


# ── LISTAR / GERENCIAR USUÁRIOS ───────────────────────────────────────────────
class CustomUserList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CustomUserSerializer(listar_usuarios(), many=True).data)


class CustomUserDetail(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        user = obter_usuario(pk)
        if not user:
            return Response({'erro': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AtualizarUsuarioSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_user = serializer.save()
        sse_broadcast('user_updated', CustomUserSerializer(updated_user).data)
        return Response(CustomUserSerializer(updated_user).data)

    def delete(self, request, pk):
        user = obter_usuario(pk)
        if not user:
            return Response({'erro': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        user_data = CustomUserSerializer(user).data
        remover_usuario(user)
        sse_broadcast('user_removed', {'id': pk})
        return Response(user_data, status=status.HTTP_200_OK)


# ─── Convites de equipe ───────────────────────────────────────────────────────

class ConviteEquipeView(APIView):
    permission_classes = [IsAuthenticated]

    def _serializar(self, convite, nome_criador):
        return {
            'id':         convite.id,
            'token':      convite.token,
            'permissao':  convite.permissao,
            'criado_em':  convite.criado_em.isoformat(),
            'expira_em':  convite.expira_em.isoformat(),
            'criado_por': nome_criador,
            'usado':      convite.usado,
        }

    def get(self, request):
        convites = listar_convites_equipe(request.user)
        return Response([self._serializar(c, request.user.name) for c in convites])

    def post(self, request):
        permissao = request.data.get('permissao', 'visualizar')
        if permissao not in ('visualizar', 'editar'):
            return Response({'erro': 'Permissão inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        dias = int(request.data.get('expira_dias', 7))
        if dias < 1 or dias > 30:
            return Response({'erro': 'Validade deve ser entre 1 e 30 dias.'}, status=status.HTTP_400_BAD_REQUEST)

        convite = criar_convite_equipe(request.user, permissao, dias)
        return Response(self._serializar(convite, request.user.name), status=status.HTTP_201_CREATED)


class ConviteEquipeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, token):
        if not cancelar_convite_equipe(token, request.user):
            return Response({'erro': 'Convite não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Perfis de template ───────────────────────────────────────────────────────

class PerfilTemplateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        perfis = PerfilTemplate.objects.filter(usuario=request.user)[:15]
        return Response([
            {
                'id':           p.id,
                'nomePerfil':   p.nome_perfil,
                'dados':        p.dados,
                'atualizadoEm': p.atualizado_em.isoformat(),
            }
            for p in perfis
        ])

    def post(self, request):
        nome = request.data.get('nomePerfil', '').strip()
        dados = request.data.get('dados', {})
        if not nome:
            return Response({'erro': 'Nome do perfil obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        # limita a 15 perfis por usuário — remove o mais antigo se necessário
        count = PerfilTemplate.objects.filter(usuario=request.user).count()
        if count >= 15:
            PerfilTemplate.objects.filter(usuario=request.user).order_by('atualizado_em').first().delete()
        perfil = PerfilTemplate.objects.create(usuario=request.user, nome_perfil=nome, dados=dados)
        return Response({
            'id':           perfil.id,
            'nomePerfil':   perfil.nome_perfil,
            'dados':        perfil.dados,
            'atualizadoEm': perfil.atualizado_em.isoformat(),
        }, status=status.HTTP_201_CREATED)


class PerfilTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            perfil = PerfilTemplate.objects.get(pk=pk, usuario=request.user)
        except PerfilTemplate.DoesNotExist:
            return Response({'erro': 'Perfil não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        perfil.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

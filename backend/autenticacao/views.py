import json
import time
import threading
from django.utils import timezone
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import CustomUser
import logging

logger = logging.getLogger(__name__)

from .serializadores import (
    LoginSerializador,
    LoginGoogleSerializador,
    RedefinirSenhaSerializador,
    SolicitarRecuperacaoSenhaSerializador,
    CadastroSerializador,
)
from .serializers import CustomUserSerializer, AtualizarUsuarioSerializer
from .servicos import (
    autenticar_usuario,
    autenticar_com_google,
    redefinir_senha as redefinir_senha_service,
    solicitar_recuperacao_senha as solicitar_recuperacao_senha_service,
    criar_usuario,
)

# ── SSE — registro de clientes conectados ─────────────────────────────────────
# Dicionário thread-safe: { user_id: set_of_queues }
# Cada aba aberta do navegador tem sua própria fila de eventos.
import queue

_sse_lock    = threading.Lock()
_sse_clients: dict[int, set] = {}   # user_id → {queue, ...}


def _sse_register(user_id: int) -> queue.SimpleQueue:
    q = queue.SimpleQueue()
    with _sse_lock:
        _sse_clients.setdefault(user_id, set()).add(q)
    return q


def _sse_unregister(user_id: int, q: queue.SimpleQueue):
    with _sse_lock:
        if user_id in _sse_clients:
            _sse_clients[user_id].discard(q)
            if not _sse_clients[user_id]:
                del _sse_clients[user_id]


def _sse_broadcast(event: str, data: dict):
    """Envia um evento SSE para TODOS os clientes conectados."""
    payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    with _sse_lock:
        all_queues = [q for qs in _sse_clients.values() for q in qs]
    for q in all_queues:
        try:
            q.put_nowait(payload)
        except Exception:
            pass


# ── LOGIN ─────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
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
def cadastro(request):
    serializador = CadastroSerializador(data=request.data)
    if not serializador.is_valid():
        logger.error(f"Erro de validação: {serializador.errors}")
        return Response(serializador.errors, status=400)
    try:
        resposta = criar_usuario(
            serializador.validated_data['email'],
            serializador.validated_data['password'],
            serializador.validated_data['name'],
            serializador.validated_data['role'],
        )
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
    """
    Extrai e valida o JWT do header Authorization OU do campo 'token' no body.
    Necessário porque sendBeacon não suporta headers customizados.
    Retorna o CustomUser ou None.
    """
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError

    # 1. Tenta pelo header padrão
    header = request.META.get('HTTP_AUTHORIZATION', '')
    raw = header.removeprefix('Bearer ').strip() if header.startswith('Bearer ') else ''

    # 2. Fallback: token no body JSON
    if not raw:
        try:
            import json as _json
            body = _json.loads(request.body or '{}')
            raw = body.get('token', '')
        except Exception:
            pass

    if not raw:
        return None

    try:
        token = AccessToken(raw)
        return CustomUser.objects.get(pk=token['user_id'])
    except (TokenError, CustomUser.DoesNotExist, Exception):
        return None


# ── HEARTBEAT ─────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def heartbeat(request):
    """
    Chamado pelo frontend a cada 25 s enquanto logado.
    Aceita token no header Authorization OU no body { token: '...' }.
    """
    user = _autenticar_token_body(request)
    if not user:
        return Response({'erro': 'Token inválido.'}, status=401)

    user.last_access = timezone.now()
    user.save(update_fields=['last_access'])

    _sse_broadcast('status_update', {
        'id':     user.id,
        'status': 'Online',
    })

    return Response({'ok': True})


# ── LOGOUT / OFFLINE EXPLÍCITO ────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_status(request):
    """
    Chamado ao fazer logout ou fechar a aba (sendBeacon).
    Preserva last_access no banco (histórico) — apenas emite Offline via SSE.
    """
    user = _autenticar_token_body(request)
    if not user:
        return Response({'erro': 'Token inválido.'}, status=401)

    # NÃO apaga last_access — ele registra o histórico do último login
    # Apenas notifica os clientes SSE que o usuário ficou Offline
    _sse_broadcast('status_update', {
        'id':     user.id,
        'status': 'Offline',
    })

    return Response({'ok': True})


# ── SSE STREAM ────────────────────────────────────────────────────────────────
def status_stream(request):
    """
    GET /api/autenticacao/status-stream/
    Abre um stream SSE. Qualquer cliente (inclusive não autenticado)
    pode ouvir atualizações de status da equipe.
    """
    # Tenta identificar o user pelo token na query string ou header
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

    q = _sse_register(user_id)

    def event_generator():
        # Envia estado atual de todos ao conectar
        users = CustomUser.objects.all().order_by('name')
        snapshot = [
            {'id': u.id, 'status': 'Online' if u.is_online else 'Offline'}
            for u in users
        ]
        yield f"event: snapshot\ndata: {json.dumps(snapshot)}\n\n"

        try:
            while True:
                try:
                    # Aguarda próximo evento (com keepalive a cada 20s)
                    msg = q.get(timeout=20)
                    yield msg
                except queue.Empty:
                    # keepalive para manter a conexão viva
                    yield ': keepalive\n\n'
        finally:
            _sse_unregister(user_id, q)

    response = StreamingHttpResponse(
        event_generator(),
        content_type='text/event-stream',
    )
    response['Cache-Control']               = 'no-cache'
    response['X-Accel-Buffering']           = 'no'
    response['Access-Control-Allow-Origin'] = '*'
    return response


# ── LISTAR USUÁRIOS ───────────────────────────────────────────────────────────
class CustomUserList(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        users = CustomUser.objects.all().order_by('name')
        serializer = CustomUserSerializer(users, many=True)
        return Response(serializer.data)


# ── ATUALIZAR USUÁRIO ─────────────────────────────────────────────────────────
class CustomUserDetail(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'erro': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AtualizarUsuarioSerializer(user, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        updated_user = serializer.save()

        # Notifica via SSE que as permissões/cargo mudaram
        _sse_broadcast('user_updated', CustomUserSerializer(updated_user).data)

        return Response(CustomUserSerializer(updated_user).data)

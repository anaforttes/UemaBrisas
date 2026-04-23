from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
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


# ── ESQUECI SENHA ─────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def solicitar_recuperacao_senha(request):
    serializador = SolicitarRecuperacaoSenhaSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = solicitar_recuperacao_senha_service(serializador.validated_data['email'])
    return Response(resposta)


# ── REDEFINIR SENHA ───────────────────────────────────────────────────────────
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


# ── LISTAR USUÁRIOS ───────────────────────────────────────────────────────────
class CustomUserList(APIView):
    """
    GET  /api/autenticacao/usuarios/        → lista todos os usuários
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        users = CustomUser.objects.all().order_by('name')
        serializer = CustomUserSerializer(users, many=True)
        return Response(serializer.data)


# ── ATUALIZAR USUÁRIO ─────────────────────────────────────────────────────────
class CustomUserDetail(APIView):
    """
    PATCH /api/autenticacao/usuarios/<id>/  → atualiza cargo, flags, permissões
    """
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
        return Response(CustomUserSerializer(updated_user).data)

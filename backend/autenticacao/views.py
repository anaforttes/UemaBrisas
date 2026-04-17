from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializadores import (
    LoginSerializador,
    LoginGoogleSerializador,
    RedefinirSenhaSerializador,
    SolicitarRecuperacaoSenhaSerializador,
    CadastroSerializador,
)
from .servicos import (
    autenticar_usuario,
    autenticar_com_google,
    redefinir_senha,
    solicitar_recuperacao_senha,
    criar_usuario,
)


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


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    serializador = LoginGoogleSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = autenticar_com_google(serializador.validated_data['credential'])
    return Response(resposta)


@api_view(['POST'])
@permission_classes([AllowAny])
def cadastro(request):
    serializador = CadastroSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = criar_usuario(
        serializador.validated_data['email'],
        serializador.validated_data['password'],
        serializador.validated_data.get('name', ''),
    )
    return Response(resposta)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    serializador = SolicitarRecuperacaoSenhaSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = solicitar_recuperacao_senha(serializador.validated_data['email'])
    return Response(resposta)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    serializador = RedefinirSenhaSerializador(data=request.data)
    serializador.is_valid(raise_exception=True)
    resposta = redefinir_senha(
        serializador.validated_data['uid'],
        serializador.validated_data['token'],
        serializador.validated_data['new_password'],
    )
    return Response(resposta)

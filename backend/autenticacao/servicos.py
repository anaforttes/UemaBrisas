from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from urllib.parse import quote
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser


def _buscar_usuario_por_email(email: str):
    return CustomUser.objects.filter(email__iexact=email).first()


def autenticar_usuario(email: str, senha: str) -> dict:
    usuario_existente = _buscar_usuario_por_email(email)

    if not usuario_existente:
        raise AuthenticationFailed("Usuario nao encontrado.")

    # Verificar a senha usando check_password (já que CustomUser herda de AbstractBaseUser)
    if not usuario_existente.check_password(senha):
        raise AuthenticationFailed("E-mail ou senha invalidos.")

    if not usuario_existente.is_active:
        raise AuthenticationFailed("Usuario inativo. Procure o administrador da plataforma.")

    refresh = RefreshToken.for_user(usuario_existente)
    
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario_existente.email,
        "name": usuario_existente.name,
        "isNewUser": False,
    }


def autenticar_com_google(credential: str) -> dict:
    try:
        dados_google = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            settings.GOOGLE_OAUTH2_CLIENT_ID,
        )
    except ValueError as exc:
        raise AuthenticationFailed(f"Token do Google invalido: {exc}")

    if dados_google.get("iss") not in [
        "accounts.google.com",
        "https://accounts.google.com",
    ]:
        raise AuthenticationFailed("Provedor de autenticacao invalido.")

    email = dados_google.get("email")
    if not email:
        raise AuthenticationFailed("O Google nao retornou um e-mail valido.")

    usuario = _buscar_usuario_por_email(email)
    criado = False

    if not usuario:
        nome_completo = f"{dados_google.get('given_name', '')} {dados_google.get('family_name', '')}".strip() or email
        usuario = CustomUser.objects.create_user(
            email=email,
            name=nome_completo,
            password=None,
        )
        criado = True
    else:
        # Atualizar nome se vazio
        if not usuario.name and (dados_google.get("given_name") or dados_google.get("family_name")):
            nome_completo = f"{dados_google.get('given_name', '')} {dados_google.get('family_name', '')}".strip()
            usuario.name = nome_completo
            usuario.save(update_fields=['name'])

    if not usuario.is_active:
        raise AuthenticationFailed("Usuario inativo. Procure o administrador da plataforma.")

    refresh = RefreshToken.for_user(usuario)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario.email,
        "name": usuario.name,
        "isNewUser": criado,
    }


def solicitar_recuperacao_senha(email: str) -> dict:
    usuario = _buscar_usuario_por_email(email)

    if usuario:
        uid = urlsafe_base64_encode(force_bytes(usuario.pk))
        token = default_token_generator.make_token(usuario)
        uid_safe = quote(uid, safe='')
        token_safe = quote(token, safe='')
        link_recuperacao = (
            f"{settings.FRONTEND_URL}/#/login?uid={uid_safe}&token={token_safe}&action=reset"
        )

        print("\n=== LINK DE RECUPERACAO LIMPO ===")
        print(link_recuperacao)
        print("================================\n")

        assunto = "Recuperacao de Senha - Sistema REURB"
        corpo_texto = (
            f"Ola {usuario.name},\n\n"
            "Recebemos uma solicitacao de recuperacao de senha.\n"
            f"Acesse o link: {link_recuperacao}\n\n"
            "Se nao solicitou, ignore este e-mail."
        )
        corpo_html = (
            f"<p>Ola {usuario.name},</p>"
            "<p>Recebemos uma solicitacao de recuperacao de senha para a sua conta.</p>"
            f'<p><a href="{link_recuperacao}">Clique aqui para redefinir sua senha</a></p>'
            f"<p>Link direto: {link_recuperacao}</p>"
            "<p>Se voce nao solicitou a recuperacao, ignore este e-mail.</p>"
        )

        msg = EmailMultiAlternatives(
            subject=assunto,
            body=corpo_texto,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[usuario.email],
        )
        msg.attach_alternative(corpo_html, "text/html")
        msg.encoding = "utf-8"
        msg.send()

    return {
        "mensagem": "Se o e-mail existe em nosso sistema, você receberá um link para redefinir sua senha.",
    }


def redefinir_senha(uid: str, token: str, nova_senha: str) -> dict:
    try:
        usuario_id = force_str(urlsafe_base64_decode(uid))
        usuario = CustomUser.objects.get(pk=usuario_id)
    except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
        raise ValidationError("Link de recuperacao invalido ou expirado.")

    if not default_token_generator.check_token(usuario, token):
        raise ValidationError("Token invalido ou expirado.")

    usuario.set_password(nova_senha)
    usuario.save()

    return {
        "mensagem": "Senha redefinida com sucesso!",
    }


def criar_usuario(email: str, password: str, name: str, role: str) -> dict:
    if CustomUser.objects.filter(email__iexact=email).exists():
        raise ValidationError("Um usuario com este e-mail ja existe.")

    usuario = CustomUser.objects.create_user(
        email=email,
        name=name,
        password=password,
        role=role,
    )

    refresh = RefreshToken.for_user(usuario)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario.email,
        "name": usuario.name,
        "isNewUser": True,
    }
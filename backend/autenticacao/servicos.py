from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from urllib.parse import quote
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken


def _buscar_usuario_por_email(email: str):
    return User.objects.filter(email__iexact=email).first()


def autenticar_usuario(email: str, senha: str) -> dict:
    usuario_existente = _buscar_usuario_por_email(email)

    if not usuario_existente:
        raise AuthenticationFailed("Usuario nao encontrado.")

    usuario = authenticate(username=usuario_existente.username, password=senha)

    if not usuario:
        raise AuthenticationFailed("E-mail ou senha invalidos.")

    if not usuario.is_active:
        raise AuthenticationFailed("Usuario inativo. Procure o administrador da plataforma.")

    refresh = RefreshToken.for_user(usuario)
    nome_completo = f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario.email,
        "name": nome_completo,
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
        usuario = User.objects.create_user(
            username=email,
            email=email,
            first_name=dados_google.get("given_name") or "",
            last_name=dados_google.get("family_name") or "",
        )
        usuario.set_unusable_password()
        usuario.save()
        criado = True
    else:
        campos_para_atualizar = []

        if not usuario.email:
            usuario.email = email
            campos_para_atualizar.append("email")

        if not usuario.first_name and dados_google.get("given_name"):
            usuario.first_name = dados_google.get("given_name") or ""
            campos_para_atualizar.append("first_name")

        if not usuario.last_name and dados_google.get("family_name"):
            usuario.last_name = dados_google.get("family_name") or ""
            campos_para_atualizar.append("last_name")

        if campos_para_atualizar:
            usuario.save(update_fields=campos_para_atualizar)

    if not usuario.is_active:
        raise AuthenticationFailed("Usuario inativo. Procure o administrador da plataforma.")

    refresh = RefreshToken.for_user(usuario)
    nome_completo = f"{usuario.first_name} {usuario.last_name}".strip() or usuario.username

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario.email,
        "name": nome_completo,
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
            f"Ola {usuario.first_name or usuario.email},\n\n"
            "Recebemos uma solicitacao de recuperacao de senha.\n"
            f"Acesse o link: {link_recuperacao}\n\n"
            "Se nao solicitou, ignore este e-mail."
        )
        corpo_html = (
            f"<p>Ola {usuario.first_name or usuario.email},</p>"
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
        "message": "Se o e-mail estiver cadastrado, um link de recuperacao foi enviado."
    }


def redefinir_senha(uid: str, token: str, nova_senha: str) -> dict:
    print("\n=== REDEFINIR SENHA ===")
    print(f"UID recebido: '{uid}'")
    print(f"TOKEN recebido: '{token}'")
    print("======================\n")

    try:
        usuario_id = force_str(urlsafe_base64_decode(uid))
        usuario = User.objects.get(pk=usuario_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValidationError({"token": "Link invalido ou expirado."})

    if not default_token_generator.check_token(usuario, token):
        raise ValidationError({"token": "Link invalido ou expirado."})

    usuario.set_password(nova_senha)
    usuario.save(update_fields=["password"])

    return {"message": "Senha atualizada com sucesso!"}


def criar_usuario(email: str, senha: str, nome: str = "") -> dict:
    if _buscar_usuario_por_email(email):
        raise ValidationError({"email": "Este e-mail ja esta cadastrado."})

    primeiro_nome = nome.split()[0] if nome else ""
    ultimo_nome = " ".join(nome.split()[1:]) if nome else ""

    usuario = User.objects.create_user(
        username=email,
        email=email,
        password=senha,
        first_name=primeiro_nome,
        last_name=ultimo_nome,
    )

    refresh = RefreshToken.for_user(usuario)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario.email,
        "name": nome,
        "isNewUser": True,
    }

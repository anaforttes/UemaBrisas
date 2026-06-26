import logging
import secrets
from datetime import timedelta
from html import escape

logger = logging.getLogger(__name__)
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
from django.utils import timezone
from .models import CustomUser, ConviteEquipe, PerfilTemplate


def _montar_email_recuperacao_texto(nome_exibicao: str, link_recuperacao: str) -> str:
    return (
        f"Ola {nome_exibicao},\n\n"
        "Recebemos uma solicitacao de recuperacao de senha para a sua conta na RegularizaAI.\n\n"
        "Para criar uma nova senha, acesse o link abaixo:\n"
        f"{link_recuperacao}\n\n"
        "Se voce nao solicitou essa recuperacao, ignore este e-mail. "
        "Nenhuma alteracao sera feita sem a sua acao.\n"
    )


def _montar_email_recuperacao_html(nome_exibicao: str, link_recuperacao: str) -> str:
    nome_seguro = escape(nome_exibicao)
    link_seguro = escape(link_recuperacao, quote=True)

    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperacao de Senha - RegularizaAI</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Segoe UI', Arial, sans-serif; color:#0f172a;">
  <div style="padding:32px 16px; background-color:#f8fafc;">
    <div style="max-width:560px; margin:0 auto; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden; box-shadow:0 20px 45px rgba(15,23,42,0.08);">
      <div style="background:linear-gradient(135deg, #2563eb, #1d4ed8); padding:36px 32px 28px; text-align:center;">
        <div style="width:64px; height:64px; margin:0 auto 16px; border-radius:18px; background:rgba(255,255,255,0.14); color:#ffffff; font-size:30px; line-height:64px; text-align:center;">
          &#128274;
        </div>
        <div style="font-size:28px; font-weight:800; line-height:1.1; letter-spacing:-0.03em; color:#ffffff;">
          Regulariza<span style="color:#bfdbfe;">AI</span>
        </div>
        <div style="margin-top:6px; font-size:12px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:rgba(255,255,255,0.74);">
          Regularizacao Fundiaria
        </div>
        <div style="margin-top:18px; font-size:20px; font-weight:700; color:#ffffff;">
          Recuperacao de Senha
        </div>
      </div>

      <div style="padding:36px 32px;">
        <p style="margin:0 0 12px; font-size:16px; font-weight:700; color:#0f172a;">
          Ola, {nome_seguro}!
        </p>
        <p style="margin:0 0 24px; font-size:14px; line-height:1.75; color:#475569;">
          Recebemos uma solicitacao de <strong>recuperacao de senha</strong> para a sua conta.
          Clique no botao abaixo para definir uma nova senha com seguranca.
        </p>

        <div style="text-align:center; margin:0 0 24px;">
          <a href="{link_seguro}" style="display:inline-block; background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; padding:15px 30px; border-radius:14px; letter-spacing:0.02em;">
            Redefinir minha senha
          </a>
        </div>

        <div style="margin:0 0 24px; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px;">
          <p style="margin:0 0 8px; font-size:12px; color:#64748b;">
            Se o botao nao funcionar, copie e cole este link no navegador:
          </p>
          <a href="{link_seguro}" style="font-size:12px; color:#2563eb; text-decoration:none; word-break:break-all;">
            {link_seguro}
          </a>
        </div>

        <div style="padding:14px 16px; background:#fff7ed; border:1px solid #fed7aa; border-left:4px solid #f59e0b; border-radius:14px;">
          <p style="margin:0; font-size:13px; line-height:1.65; color:#9a3412;">
            <strong>Nao solicitou a recuperacao?</strong> Ignore este e-mail.
            Sua senha atual permanecera a mesma enquanto nenhuma acao for concluida por voce.
          </p>
        </div>
      </div>

      <div style="padding:20px 32px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
        <p style="margin:0; font-size:12px; line-height:1.7; color:#64748b;">
          Este e-mail foi enviado automaticamente pela <strong style="color:#334155;">RegularizaAI</strong>.<br />
          Por favor, nao responda esta mensagem.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
""".strip()


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

    # Marca online imediatamente e notifica via SSE
    usuario_existente.last_access = timezone.now()
    usuario_existente.save(update_fields=['last_access'])

    from autenticacao.sse import sse_broadcast
    sse_broadcast('status_update', {
        'id':     usuario_existente.id,
        'status': 'Online',
    })

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

    usuario.last_access = timezone.now()
    usuario.save(update_fields=['last_access'])

    from autenticacao.sse import sse_broadcast
    sse_broadcast('status_update', {
        'id':     usuario.id,
        'status': 'Online',
    })

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

        logger.info("Link de recuperação gerado para: %s", usuario.email)

        assunto = "Recuperacao de Senha - RegularizaAI"
        corpo_texto = _montar_email_recuperacao_texto(usuario.name, link_recuperacao)
        corpo_html  = _montar_email_recuperacao_html(usuario.name, link_recuperacao)

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


def criar_usuario(email: str, password: str, name: str, role: str = 'Atendente') -> dict:
    if CustomUser.objects.filter(email__iexact=email).exists():
        raise ValidationError("Um usuario com este e-mail ja existe.")

    # Conta criada como inativa — admin aprova manualmente e atribui cargo
    CustomUser.objects.create_user(
        email=email,
        name=name,
        password=password,
        role=role,
        is_active=False,
    )

    return {
        "mensagem": "Solicitação enviada com sucesso. Aguarde a aprovação do administrador.",
    }


# ─── Status / presença ────────────────────────────────────────────────────────

def obter_usuario_por_token(raw_token: str):
    """Retorna o CustomUser a partir de um access token cru, ou None se inválido."""
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError

    if not raw_token:
        return None
    try:
        token = AccessToken(raw_token)
        return CustomUser.objects.get(pk=token['user_id'])
    except (TokenError, CustomUser.DoesNotExist, Exception):
        return None


def marcar_online(usuario) -> None:
    usuario.last_access = timezone.now()
    usuario.save(update_fields=['last_access'])


def snapshot_status_usuarios() -> list[dict]:
    return [
        {'id': u.id, 'status': 'Online' if u.is_online else 'Offline'}
        for u in CustomUser.objects.all().order_by('name')
    ]


# ─── Gestão de usuários ───────────────────────────────────────────────────────

def listar_usuarios():
    return CustomUser.objects.all().order_by('name')


def obter_usuario(pk):
    return CustomUser.objects.filter(pk=pk).first()


def remover_usuario(usuario) -> None:
    usuario.delete()


# ─── Convites de equipe ───────────────────────────────────────────────────────

def listar_convites_equipe(usuario):
    return ConviteEquipe.objects.filter(
        criado_por=usuario,
        usado=False,
        expira_em__gt=timezone.now(),
    )


def criar_convite_equipe(usuario, permissao: str, dias: int) -> ConviteEquipe:
    return ConviteEquipe.objects.create(
        token=secrets.token_urlsafe(32),
        permissao=permissao,
        criado_por=usuario,
        expira_em=timezone.now() + timedelta(days=dias),
    )


def cancelar_convite_equipe(token: str, usuario) -> bool:
    convite = ConviteEquipe.objects.filter(token=token, criado_por=usuario).first()
    if not convite:
        return False
    convite.usado = True
    convite.save(update_fields=['usado'])
    return True


# ─── Perfis de template ───────────────────────────────────────────────────────

def listar_perfis_template(usuario):
    return PerfilTemplate.objects.filter(usuario=usuario)[:15]


def salvar_perfil_template(usuario, nome: str, dados) -> PerfilTemplate:
    # limita a 15 perfis por usuário — remove o mais antigo se necessário
    if PerfilTemplate.objects.filter(usuario=usuario).count() >= 15:
        mais_antigo = PerfilTemplate.objects.filter(usuario=usuario).order_by('atualizado_em').first()
        if mais_antigo:
            mais_antigo.delete()
    return PerfilTemplate.objects.create(usuario=usuario, nome_perfil=nome, dados=dados)


def remover_perfil_template(pk, usuario) -> bool:
    perfil = PerfilTemplate.objects.filter(pk=pk, usuario=usuario).first()
    if not perfil:
        return False
    perfil.delete()
    return True
import logging
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
from django.db.models import Count, Q
from .models import CustomUser, TentativaLogin


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


def registrar_tentativa_login(
    *,
    email: str = '',
    provedor: str,
    sucesso: bool,
    usuario: CustomUser | None = None,
    motivo: str = '',
    request=None,
) -> None:
    try:
        ip = None
        user_agent = ''
        if request is not None:
            forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
            ip = forwarded_for.split(',')[0].strip() if forwarded_for else request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:1000]

        TentativaLogin.objects.create(
            usuario=usuario,
            email=email or getattr(usuario, 'email', ''),
            provedor=provedor,
            sucesso=sucesso,
            motivo=motivo[:255],
            ip=ip or None,
            user_agent=user_agent,
        )
    except Exception:
        logger.exception('Falha ao registrar tentativa de login')


def obter_monitoramento_login() -> dict:
    agregados = TentativaLogin.objects.aggregate(
        tentativas=Count('id'),
        sucessos=Count('id', filter=Q(sucesso=True)),
        falhas=Count('id', filter=Q(sucesso=False)),
    )
    tentativas = agregados['tentativas'] or 0
    sucessos = agregados['sucessos'] or 0
    falhas = agregados['falhas'] or 0
    return {
        'tentativas': tentativas,
        'sucessos': sucessos,
        'falhas': falhas,
        'taxa_sucesso': round((sucessos / tentativas) * 100) if tentativas else 0,
        'atualizado_em': timezone.now().isoformat(),
    }


def autenticar_usuario(email: str, senha: str, request=None) -> dict:
    usuario_existente = _buscar_usuario_por_email(email)

    if not usuario_existente:
        registrar_tentativa_login(
            email=email,
            provedor='senha',
            sucesso=False,
            motivo='Usuario nao encontrado.',
            request=request,
        )
        raise AuthenticationFailed("Usuario nao encontrado.")

    # Verificar a senha usando check_password (já que CustomUser herda de AbstractBaseUser)
    if not usuario_existente.check_password(senha):
        registrar_tentativa_login(
            email=email,
            provedor='senha',
            sucesso=False,
            usuario=usuario_existente,
            motivo='E-mail ou senha invalidos.',
            request=request,
        )
        raise AuthenticationFailed("E-mail ou senha invalidos.")

    if not usuario_existente.is_active:
        registrar_tentativa_login(
            email=email,
            provedor='senha',
            sucesso=False,
            usuario=usuario_existente,
            motivo='Usuario inativo.',
            request=request,
        )
        raise AuthenticationFailed("Usuario inativo. Procure o administrador da plataforma.")

    # Marca online imediatamente e notifica via SSE
    usuario_existente.last_access = timezone.now()
    usuario_existente.save(update_fields=['last_access'])

    try:
        from autenticacao.sse import sse_broadcast
        sse_broadcast('status_update', {
            'id':     usuario_existente.id,
            'status': 'Online',
        })
    except Exception:
        pass

    registrar_tentativa_login(
        email=email,
        provedor='senha',
        sucesso=True,
        usuario=usuario_existente,
        request=request,
    )

    refresh = RefreshToken.for_user(usuario_existente)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "email": usuario_existente.email,
        "name": usuario_existente.name,
        "isNewUser": False,
    }


def autenticar_com_google(credential: str, request=None) -> dict:
    try:
        dados_google = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            settings.GOOGLE_OAUTH2_CLIENT_ID,
        )
    except ValueError as exc:
        registrar_tentativa_login(
            provedor='google',
            sucesso=False,
            motivo=f'Token do Google invalido: {exc}',
            request=request,
        )
        raise AuthenticationFailed(f"Token do Google invalido: {exc}")

    if dados_google.get("iss") not in [
        "accounts.google.com",
        "https://accounts.google.com",
    ]:
        registrar_tentativa_login(
            provedor='google',
            sucesso=False,
            motivo='Provedor de autenticacao invalido.',
            request=request,
        )
        raise AuthenticationFailed("Provedor de autenticacao invalido.")

    email = dados_google.get("email")
    if not email:
        registrar_tentativa_login(
            provedor='google',
            sucesso=False,
            motivo='Google nao retornou e-mail.',
            request=request,
        )
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
        registrar_tentativa_login(
            email=email,
            provedor='google',
            sucesso=False,
            usuario=usuario,
            motivo='Usuario inativo.',
            request=request,
        )
        raise AuthenticationFailed("Usuario inativo. Procure o administrador da plataforma.")

    usuario.last_access = timezone.now()
    usuario.save(update_fields=['last_access'])

    try:
        from autenticacao.sse import sse_broadcast
        sse_broadcast('status_update', {
            'id':     usuario.id,
            'status': 'Online',
        })
    except Exception:
        pass

    registrar_tentativa_login(
        email=email,
        provedor='google',
        sucesso=True,
        usuario=usuario,
        request=request,
    )

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
        role='Atendente',
        is_active=False,
    )

    return {
        "mensagem": "Solicitação enviada com sucesso. Aguarde a aprovação do administrador.",
    }

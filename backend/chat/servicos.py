# Regras de negocio do app chat.
from django.utils.dateparse import parse_datetime

from .models import MensagemChat


def listar_mensagens(desde: str | None = None):
    qs = MensagemChat.objects.select_related('usuario').order_by('criado_em')
    if desde:
        dt = parse_datetime(desde)
        if dt:
            return qs.filter(criado_em__gt=dt)
        return qs
    return qs[:100]


def criar_mensagem(usuario, texto: str) -> MensagemChat:
    return MensagemChat.objects.create(usuario=usuario, texto=texto)

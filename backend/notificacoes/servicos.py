from .models import Notificacao


def criar_notificacao(usuario, tipo: str, titulo: str, descricao: str = '', link: str = '') -> Notificacao:
    return Notificacao.objects.create(
        usuario=usuario,
        tipo=tipo,
        titulo=titulo,
        descricao=descricao,
        link=link,
    )


def listar_notificacoes(usuario, apenas_nao_lidas: bool = False):
    qs = Notificacao.objects.filter(usuario=usuario)
    if apenas_nao_lidas:
        qs = qs.filter(lida=False)
    return qs[:50]


def marcar_lida(notificacao_id: int, usuario) -> bool:
    updated = Notificacao.objects.filter(id=notificacao_id, usuario=usuario).update(lida=True)
    return updated > 0


def marcar_todas_lidas(usuario) -> int:
    return Notificacao.objects.filter(usuario=usuario, lida=False).update(lida=True)

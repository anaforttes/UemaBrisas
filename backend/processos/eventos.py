from .models import EventoProcesso


def registrar(processo, tipo, descricao, usuario=None, dados=None):
    EventoProcesso.objects.create(
        processo=processo,
        tipo=tipo,
        descricao=descricao,
        usuario=usuario,
        dados=dados or {},
    )

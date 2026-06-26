# Regras de negocio do app anexos.
from processos.eventos import registrar
from .models import Anexo


def listar_anexos(processo):
    return processo.anexos.select_related('adicionado_por').all()


def criar_anexo(processo, arquivo, etapa_numero, usuario) -> Anexo:
    anexo = Anexo.objects.create(
        processo=processo,
        nome=arquivo.name,
        tipo=arquivo.content_type,
        tamanho=arquivo.size,
        arquivo=arquivo,
        adicionado_por=usuario,
        etapa_numero=etapa_numero,
    )

    descricao = f'Arquivo adicionado: {arquivo.name}'
    if etapa_numero:
        descricao += f' (etapa {etapa_numero})'
    registrar(processo, 'arquivo_adicionado', descricao, usuario,
              {'arquivo': arquivo.name, 'etapa_numero': etapa_numero})

    return anexo


def remover_anexo(anexo, usuario) -> None:
    processo = anexo.processo
    nome = anexo.nome
    etapa_numero = anexo.etapa_numero

    anexo.arquivo.delete(save=False)
    anexo.delete()

    descricao = f'Arquivo removido: {nome}'
    if etapa_numero:
        descricao += f' (etapa {etapa_numero})'
    registrar(processo, 'arquivo_removido', descricao, usuario,
              {'arquivo': nome, 'etapa_numero': etapa_numero})

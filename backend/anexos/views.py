from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from processos.models import Processo
from processos.eventos import registrar
from .models import Anexo


def _serializar(anexo, request):
    return {
        'id':             anexo.id,
        'nome':           anexo.nome,
        'tipo':           anexo.tipo,
        'tamanho':        anexo.tamanho,
        'url':            request.build_absolute_uri(anexo.arquivo.url),
        'etapa_numero':   anexo.etapa_numero,
        'adicionado_por': anexo.adicionado_por.name if anexo.adicionado_por else None,
        'adicionado_em':  anexo.adicionado_em.isoformat(),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def anexos_processo(request, processo_pk):
    processo = get_object_or_404(Processo, pk=processo_pk)

    if request.method == 'GET':
        anexos = processo.anexos.select_related('adicionado_por').all()
        return Response([_serializar(a, request) for a in anexos])

    arquivo = request.FILES.get('arquivo')
    if not arquivo:
        return Response({'erro': 'Arquivo obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    etapa_numero = request.data.get('etapa_numero')
    if etapa_numero:
        try:
            etapa_numero = int(etapa_numero)
        except (ValueError, TypeError):
            etapa_numero = None

    anexo = Anexo.objects.create(
        processo=processo,
        nome=arquivo.name,
        tipo=arquivo.content_type,
        tamanho=arquivo.size,
        arquivo=arquivo,
        adicionado_por=request.user,
        etapa_numero=etapa_numero,
    )

    descricao = f'Arquivo adicionado: {arquivo.name}'
    if etapa_numero:
        descricao += f' (etapa {etapa_numero})'
    registrar(processo, 'arquivo_adicionado', descricao, request.user,
              {'arquivo': arquivo.name, 'etapa_numero': etapa_numero})

    return Response(_serializar(anexo, request), status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def anexo_detalhe(request, pk):
    anexo = get_object_or_404(Anexo, pk=pk)
    processo = anexo.processo
    nome = anexo.nome
    etapa_numero = anexo.etapa_numero

    anexo.arquivo.delete(save=False)
    anexo.delete()

    descricao = f'Arquivo removido: {nome}'
    if etapa_numero:
        descricao += f' (etapa {etapa_numero})'
    registrar(processo, 'arquivo_removido', descricao, request.user,
              {'arquivo': nome, 'etapa_numero': etapa_numero})

    return Response(status=status.HTTP_204_NO_CONTENT)

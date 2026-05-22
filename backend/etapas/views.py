from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from processos.models import Processo
from .models import Etapa
from .serializadores import EtapaSerializer
from .servicos import criar_etapas_padrao, atualizar_progresso


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_etapas(request, processo_pk):
    processo = get_object_or_404(Processo, pk=processo_pk)
    etapas   = processo.etapas.select_related('responsavel').all()
    return Response(EtapaSerializer(etapas, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def protocolar(request, processo_pk):
    processo = get_object_or_404(Processo, pk=processo_pk)

    if processo.protocolado:
        etapas = processo.etapas.select_related('responsavel').all()
        return Response(EtapaSerializer(etapas, many=True).data)

    processo.protocolado = True
    processo.status      = 'Em Andamento'
    processo.save(update_fields=['protocolado', 'status'])

    etapas = criar_etapas_padrao(processo)
    return Response(EtapaSerializer(etapas, many=True).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def atualizar_etapa(request, pk):
    etapa = get_object_or_404(Etapa.objects.select_related('processo', 'responsavel'), pk=pk)

    novo_status = request.data.get('status')
    if novo_status and novo_status != etapa.status:
        etapa.status = novo_status
        if novo_status == 'em_andamento' and not etapa.data_inicio:
            etapa.data_inicio = timezone.now().date()
        if novo_status == 'concluida':
            etapa.data_conclusao = timezone.now().date()
        atualizar_progresso(etapa.processo)

    if 'observacoes' in request.data:
        etapa.observacoes = request.data['observacoes']

    if 'responsavel_id' in request.data:
        etapa.responsavel_id = request.data['responsavel_id']

    etapa.save()
    return Response(EtapaSerializer(etapa).data)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from processos.models import Processo
from .models import Etapa
from .serializadores import EtapaSerializer
from .servicos import listar_etapas, protocolar_processo, atualizar_etapa


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_etapas_view(request, processo_pk):
    processo = get_object_or_404(Processo, pk=processo_pk)
    return Response(EtapaSerializer(listar_etapas(processo), many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def protocolar(request, processo_pk):
    processo = get_object_or_404(Processo, pk=processo_pk)
    etapas, criado = protocolar_processo(processo, request.user)
    http_status = status.HTTP_201_CREATED if criado else status.HTTP_200_OK
    return Response(EtapaSerializer(etapas, many=True).data, status=http_status)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def atualizar_etapa_view(request, pk):
    etapa = get_object_or_404(Etapa.objects.select_related('processo', 'responsavel'), pk=pk)
    etapa = atualizar_etapa(etapa, request.data, request.user)
    return Response(EtapaSerializer(etapa).data)

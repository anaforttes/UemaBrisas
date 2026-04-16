from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Processo
from .serializadores import ProcessoSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def processos_view(request):
    """Lista todos os processos ou cria um novo."""

    if request.method == "GET":
        qs = Processo.objects.all()

        # Filtros opcionais via query string
        busca = request.query_params.get("search", "").strip()
        if busca:
            qs = qs.filter(title__icontains=busca) | qs.filter(
                applicant__icontains=busca
            ) | qs.filter(protocol__icontains=busca)

        status_filtro = request.query_params.get("status", "").strip()
        if status_filtro:
            qs = qs.filter(status=status_filtro)

        serializer = ProcessoSerializer(qs, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = ProcessoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def processo_detalhe(request, pk):
    """Detalhe, atualização parcial ou exclusão de um processo."""

    processo = get_object_or_404(Processo, pk=pk)

    if request.method == "GET":
        serializer = ProcessoSerializer(processo)
        return Response(serializer.data)

    if request.method == "PATCH":
        serializer = ProcessoSerializer(processo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "DELETE":
        processo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Retorna os cards de resumo para o painel."""
    total   = Processo.objects.count()
    ativos  = Processo.objects.exclude(status__in=["Concluído", "Finalizado", "Arquivado", "Cancelado"]).count()
    concluidos = Processo.objects.filter(status__in=["Concluído", "Finalizado"]).count()
    em_revisao = Processo.objects.filter(status="Em Análise").count()

    return Response({
        "total":      total,
        "ativos":     ativos,
        "concluidos": concluidos,
        "em_revisao": em_revisao,
    })

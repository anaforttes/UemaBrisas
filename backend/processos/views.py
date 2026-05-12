from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Processo
from .serializadores import ProcessoSerializer
from .servicos import (
    listar_processos, criar_processo, processos_do_usuario,
    papeis_no_processo, calcular_stats,
)
from .permissoes import pode_editar_processo, pode_deletar_processo


class ProcessoPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def processos_view(request):
    if request.method == "GET":
        qs = listar_processos(
            search=request.query_params.get("search", "").strip(),
            status_filtro=request.query_params.get("status", "").strip(),
        )
        paginator = ProcessoPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ProcessoSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = ProcessoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(criado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def processo_detalhe(request, pk):
    processo = get_object_or_404(Processo, pk=pk)

    if request.method == "GET":
        return Response(ProcessoSerializer(processo).data)

    if request.method == "PATCH":
        if not pode_editar_processo(request.user, processo):
            return Response({'erro': 'Sem permissão para editar.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProcessoSerializer(processo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "DELETE":
        if not pode_deletar_processo(request.user, processo):
            return Response({'erro': 'Sem permissão para excluir.'}, status=status.HTTP_403_FORBIDDEN)
        processo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def processos_meus(request):
    from documentos.models import Documento, ColaboradorDocumento

    uid = request.user.pk
    doc_ids_criados = Documento.objects.filter(criado_por_id=uid).values_list('processo_id', flat=True)
    doc_ids_colab   = Documento.objects.filter(
        colaboradores__usuario_id=uid
    ).values_list('processo_id', flat=True)
    processo_ids_docs = {str(pid) for pid in list(doc_ids_criados) + list(doc_ids_colab) if pid}

    qs = processos_do_usuario(request.user)
    serializer = ProcessoSerializer(qs, many=True)

    dados = [
        {**proc, 'meus_papeis': papeis_no_processo(request.user, obj, processo_ids_docs)}
        for proc, obj in zip(serializer.data, qs)
    ]
    return Response(dados)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    return Response(calcular_stats())

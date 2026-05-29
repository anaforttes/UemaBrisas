from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Processo, EventoProcesso
from .serializadores import ProcessoSerializer
from .servicos import (
    listar_processos, criar_processo, processos_do_usuario,
    papeis_no_processo, calcular_stats,
)
from .permissoes import pode_editar_processo, pode_deletar_processo
from .eventos import registrar


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

        # Inclui meus_papeis em uma única query extra (evita chamada separada /meus/)
        from documentos.models import Documento, ColaboradorDocumento
        uid = request.user.pk
        doc_pids = (
            set(Documento.objects.filter(criado_por_id=uid).values_list('processo_id', flat=True)) |
            set(ColaboradorDocumento.objects.filter(usuario_id=uid).values_list('documento__processo_id', flat=True))
        )
        processo_ids_docs = {str(pid) for pid in doc_pids if pid}
        dados = [
            {**proc, 'meus_papeis': papeis_no_processo(request.user, obj, processo_ids_docs)}
            for proc, obj in zip(serializer.data, page)
        ]
        return paginator.get_paginated_response(dados)

    serializer = ProcessoSerializer(data=request.data)
    if serializer.is_valid():
        processo = serializer.save(criado_por=request.user)
        registrar(processo, 'processo_criado', 'Processo criado.', request.user)
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

        # Log team changes before saving
        from autenticacao.models import CustomUser
        for campo, label in [('technician_id', 'Técnico'), ('legal_id', 'Jurídico')]:
            novo_id = request.data.get(campo)
            if novo_id is not None:
                atual_id = getattr(processo, campo + '_id', None)
                if str(novo_id) != str(atual_id or ''):
                    try:
                        nome = CustomUser.objects.get(pk=novo_id).name if novo_id else 'Nenhum'
                    except CustomUser.DoesNotExist:
                        nome = str(novo_id)
                    registrar(processo, 'equipe_alterada',
                              f'{label} atribuído: {nome}',
                              request.user, {'campo': campo, 'novo_id': novo_id, 'nome': nome})

        if 'status' in request.data and request.data['status'] != processo.status:
            registrar(processo, 'status_alterado',
                      f'Status alterado: {processo.status} → {request.data["status"]}',
                      request.user, {'de': processo.status, 'para': request.data['status']})

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
    doc_ids_colab   = ColaboradorDocumento.objects.filter(
        usuario_id=uid
    ).values_list('documento__processo_id', flat=True)
    processo_ids_docs = {str(pid) for pid in list(doc_ids_criados) + list(doc_ids_colab) if pid}

    qs = processos_do_usuario(request.user, processo_ids_docs)
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def eventos_processo(request, pk):
    processo = get_object_or_404(Processo, pk=pk)
    eventos = processo.eventos.select_related('usuario').all()
    data = [
        {
            'id':        e.id,
            'tipo':      e.tipo,
            'descricao': e.descricao,
            'usuario':   e.usuario.name if e.usuario else 'Sistema',
            'dados':     e.dados,
            'criado_em': e.criado_em.isoformat(),
        }
        for e in eventos
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def consulta_publica(request, protocolo):
    protocolo_norm = protocolo.strip().upper()
    try:
        processo = Processo.objects.get(protocol__iexact=protocolo_norm)
    except Processo.DoesNotExist:
        return Response({'erro': 'Protocolo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    etapas = processo.etapas.all().order_by('numero')

    return Response({
        'protocolo':      processo.protocol,
        'titulo':         processo.title,
        'requerente':     processo.applicant,
        'status':         processo.status,
        'progresso':      processo.progress,
        'modalidade':     processo.modality,
        'municipio':      processo.municipio,
        'estado':         processo.estado,
        'endereco':       processo.location,
        'area':           processo.area,
        'criado_em':      processo.created_at.date().isoformat(),
        'atualizado_em':  processo.updated_at.date().isoformat(),
        'etapas': [
            {
                'numero':         e.numero,
                'nome':           e.nome,
                'eixo':           e.eixo,
                'status':         e.status,
                'data_inicio':    e.data_inicio.isoformat() if e.data_inicio else None,
                'data_conclusao': e.data_conclusao.isoformat() if e.data_conclusao else None,
            }
            for e in etapas
        ],
    })

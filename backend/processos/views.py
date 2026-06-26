from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Processo, ConviteAtribuicao
from .serializadores import ProcessoSerializer, ConviteAtribuicaoSerializer
from .servicos import (
    listar_processos, processos_do_usuario,
    papeis_no_processo, calcular_stats,
    atribuir_ou_convidar, responder_convite,
    ids_processos_com_documentos, registrar_alteracoes_processo,
    deletar_processo, listar_convites_pendentes, listar_eventos,
    consultar_por_protocolo,
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
        processo_ids_docs = ids_processos_com_documentos(request.user)
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

        registrar_alteracoes_processo(processo, request.data, request.user)

        serializer = ProcessoSerializer(processo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "DELETE":
        if not pode_deletar_processo(request.user, processo):
            return Response({'erro': 'Sem permissão para excluir.'}, status=status.HTTP_403_FORBIDDEN)
        deletar_processo(processo)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def processos_meus(request):
    processo_ids_docs = ids_processos_com_documentos(request.user)
    qs = processos_do_usuario(request.user, processo_ids_docs)
    serializer = ProcessoSerializer(qs, many=True)

    dados = [
        {**proc, 'meus_papeis': papeis_no_processo(request.user, obj, processo_ids_docs)}
        for proc, obj in zip(serializer.data, qs)
    ]
    return Response(dados)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def atribuir_view(request, pk):
    from autenticacao.models import CustomUser
    processo = get_object_or_404(Processo, pk=pk)
    if not pode_editar_processo(request.user, processo):
        return Response({'erro': 'Sem permissão para atribuir equipe.'},
                        status=status.HTTP_403_FORBIDDEN)

    papel = request.data.get('papel')
    usuario_id = request.data.get('usuario_id')
    if papel not in ('tecnico', 'juridico'):
        return Response({'erro': 'Papel inválido.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        resultado, convite = atribuir_ou_convidar(processo, papel, usuario_id, request.user)
    except CustomUser.DoesNotExist:
        return Response({'erro': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    data = {'resultado': resultado, 'processo': ProcessoSerializer(processo).data}
    if convite:
        data['convite'] = ConviteAtribuicaoSerializer(convite).data
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def convites_processo(request, pk):
    processo = get_object_or_404(Processo, pk=pk)
    if not pode_editar_processo(request.user, processo):
        return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
    convites = listar_convites_pendentes(processo)
    return Response(ConviteAtribuicaoSerializer(convites, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def responder_convite_view(request, pk):
    convite = get_object_or_404(ConviteAtribuicao, pk=pk)
    acao = request.data.get('acao')
    try:
        responder_convite(convite, request.user, acao)
    except PermissionError as e:
        return Response({'erro': str(e)}, status=status.HTTP_403_FORBIDDEN)
    except ValueError as e:
        return Response({'erro': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(ConviteAtribuicaoSerializer(convite).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    return Response(calcular_stats())


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def eventos_processo(request, pk):
    processo = get_object_or_404(Processo, pk=pk)
    eventos = listar_eventos(processo)
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
    processo = consultar_por_protocolo(protocolo)
    if processo is None:
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

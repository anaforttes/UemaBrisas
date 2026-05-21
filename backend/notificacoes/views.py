from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Notificacao
from .serializadores import NotificacaoSerializer
from .servicos import listar_notificacoes, marcar_lida, marcar_todas_lidas


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_view(request):
    apenas_nao_lidas = request.GET.get('nao_lidas') == '1'
    qs_base = Notificacao.objects.filter(usuario=request.user)
    nao_lidas = qs_base.filter(lida=False).count()
    notificacoes = listar_notificacoes(request.user, apenas_nao_lidas=apenas_nao_lidas)
    serializer = NotificacaoSerializer(notificacoes, many=True)
    return Response({'resultados': serializer.data, 'nao_lidas': nao_lidas})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def marcar_lida_view(request, pk):
    ok = marcar_lida(pk, request.user)
    if not ok:
        return Response({'detail': 'Notificação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_todas_view(request):
    count = marcar_todas_lidas(request.user)
    return Response({'marcadas': count})

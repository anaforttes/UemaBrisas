from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializadores import MensagemChatSerializer
from .servicos import listar_mensagens, criar_mensagem


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def mensagens_view(request):
    if request.method == 'GET':
        qs = listar_mensagens(request.query_params.get('desde'))
        return Response(MensagemChatSerializer(qs, many=True).data)

    texto = request.data.get('texto', '').strip()
    if not texto:
        return Response({'erro': 'Texto obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
    msg = criar_mensagem(request.user, texto)
    return Response(MensagemChatSerializer(msg).data, status=status.HTTP_201_CREATED)

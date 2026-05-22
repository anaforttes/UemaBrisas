from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_datetime

from .models import MensagemChat
from .serializadores import MensagemChatSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def mensagens_view(request):
    if request.method == 'GET':
        qs = MensagemChat.objects.select_related('usuario').order_by('criado_em')
        desde = request.query_params.get('desde')
        if desde:
            dt = parse_datetime(desde)
            if dt:
                qs = qs.filter(criado_em__gt=dt)
        else:
            qs = qs[:100]
        return Response(MensagemChatSerializer(qs, many=True).data)

    texto = request.data.get('texto', '').strip()
    if not texto:
        return Response({'erro': 'Texto obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
    msg = MensagemChat.objects.create(usuario=request.user, texto=texto)
    return Response(MensagemChatSerializer(msg).data, status=status.HTTP_201_CREATED)

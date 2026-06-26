from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .servicos import listar_usuarios_ativos


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_usuarios(request):
    return Response(listar_usuarios_ativos())

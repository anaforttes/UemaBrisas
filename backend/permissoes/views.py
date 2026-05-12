from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .servicos import obter_permissoes_usuario


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permissoes_view(request):
    return Response(obter_permissoes_usuario(request.user))

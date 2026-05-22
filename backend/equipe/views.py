from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from autenticacao.models import CustomUser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_usuarios(request):
    qs = CustomUser.objects.filter(is_active=True).values('id', 'name', 'email', 'role')
    return Response(list(qs))

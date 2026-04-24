from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def listar_usuarios(request):
    usuarios = [
        {"id": 1, "name": "Administrador", "role": "technician"},
        {"id": 2, "name": "João Técnico", "role": "technician"},
        {"id": 3, "name": "Maria Jurídico", "role": "legal"},
    ]
    return Response(usuarios)
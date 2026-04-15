from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Processo
from .serializadores import ProcessoSerializer


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def processos_view(request):
    if request.method == "GET":
        processos = Processo.objects.all().order_by("-created_at")
        serializer = ProcessoSerializer(processos, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = ProcessoSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
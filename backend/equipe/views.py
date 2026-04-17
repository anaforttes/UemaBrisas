from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Membro
from .serializadores import MembroSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def membros_view(request):
    """Lista todos os membros ou cria um novo."""

    if request.method == "GET":
        qs = Membro.objects.all()

        # Filtros opcionais via query string
        busca = request.query_params.get("search", "").strip()
        if busca:
            qs = qs.filter(name__icontains=busca) | qs.filter(email__icontains=busca)

        role_filtro = request.query_params.get("role", "").strip()
        if role_filtro:
            qs = qs.filter(role=role_filtro)

        status_filtro = request.query_params.get("status", "").strip()
        if status_filtro:
            qs = qs.filter(status=status_filtro)

        serializer = MembroSerializer(qs, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = MembroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def membro_detalhe(request, pk):
    """Detalhe, atualização parcial ou exclusão de um membro."""

    membro = get_object_or_404(Membro, pk=pk)

    if request.method == "GET":
        serializer = MembroSerializer(membro)
        return Response(serializer.data)

    if request.method == "PATCH":
        serializer = MembroSerializer(membro, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "DELETE":
        membro.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

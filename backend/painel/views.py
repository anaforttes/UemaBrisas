from django.http import JsonResponse
from .servicos import obter_dashboard

def dashboard_view(request):
    dados = obter_dashboard()
    return JsonResponse(dados)
from django.http import JsonResponse
from .servicos import obter_dashboard

def dashboard_view(request):
    status_filtro = request.GET.get("status")
    dados = obter_dashboard(status_filtro=status_filtro)
    return JsonResponse(dados)

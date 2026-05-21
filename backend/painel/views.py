from django.http import JsonResponse
from .servicos import obter_dashboard, obter_agregacoes


def dashboard_view(request):
    dados = obter_dashboard()
    return JsonResponse(dados)


def agregacoes_view(request):
    periodo = request.GET.get('periodo', 'all')
    modalidade = request.GET.get('modalidade', 'todos')
    dados = obter_agregacoes(periodo=periodo, modalidade=modalidade)
    return JsonResponse(dados)
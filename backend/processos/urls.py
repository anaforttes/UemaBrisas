from django.urls import path
from .views import processos_view, processo_detalhe, dashboard_stats

urlpatterns = [
    path("",           processos_view,   name="processos"),
    path("<int:pk>/",  processo_detalhe, name="processo-detalhe"),
    path("stats/",     dashboard_stats,  name="processos-stats"),
]

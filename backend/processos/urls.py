from django.urls import path
from .views import processos_view, processo_detalhe, dashboard_stats, processos_meus

urlpatterns = [
    path("",           processos_view,   name="processos"),
    path("meus/",      processos_meus,   name="processos-meus"),
    path("stats/",     dashboard_stats,  name="processos-stats"),
    path("<int:pk>/",  processo_detalhe, name="processo-detalhe"),
]

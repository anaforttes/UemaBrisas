from django.urls import path
from .views import (
    processos_view, processo_detalhe, dashboard_stats, processos_meus,
    consulta_publica, eventos_processo, atribuir_view, convites_processo,
    responder_convite_view,
)

urlpatterns = [
    path("",                            processos_view,         name="processos"),
    path("meus/",                       processos_meus,         name="processos-meus"),
    path("stats/",                      dashboard_stats,        name="processos-stats"),
    path("consulta/<str:protocolo>/",   consulta_publica,       name="consulta-publica"),
    path("convites/<int:pk>/responder/", responder_convite_view, name="convite-responder"),
    path("<int:pk>/",                   processo_detalhe,       name="processo-detalhe"),
    path("<int:pk>/eventos/",           eventos_processo,       name="processo-eventos"),
    path("<int:pk>/atribuir/",          atribuir_view,          name="processo-atribuir"),
    path("<int:pk>/convites/",          convites_processo,      name="processo-convites"),
]

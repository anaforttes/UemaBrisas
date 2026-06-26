from django.urls import path
from .views import listar_etapas_view, protocolar

urlpatterns = [
    path('', listar_etapas_view),
    path('protocolar/', protocolar),
]

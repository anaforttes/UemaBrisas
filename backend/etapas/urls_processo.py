from django.urls import path
from .views import listar_etapas, protocolar

urlpatterns = [
    path('', listar_etapas),
    path('protocolar/', protocolar),
]

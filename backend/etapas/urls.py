from django.urls import path
from .views import atualizar_etapa_view

urlpatterns = [
    path('<int:pk>/', atualizar_etapa_view),
]

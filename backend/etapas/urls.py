from django.urls import path
from .views import atualizar_etapa

urlpatterns = [
    path('<int:pk>/', atualizar_etapa),
]

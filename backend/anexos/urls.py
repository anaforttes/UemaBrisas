from django.urls import path
from .views import anexo_detalhe

urlpatterns = [
    path('<int:pk>/', anexo_detalhe),
]

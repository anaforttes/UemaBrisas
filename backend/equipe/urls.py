from django.urls import path
from .views import listar_usuarios

urlpatterns = [
    path('', listar_usuarios),
]

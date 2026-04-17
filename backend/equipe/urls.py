from django.urls import path
from . import views

urlpatterns = [
    path('membros/', views.membros_view, name='membros'),
    path('membros/<int:pk>/', views.membro_detalhe, name='membro_detalhe'),
]

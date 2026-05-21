from django.urls import path
from .views import listar_view, marcar_lida_view, marcar_todas_view

urlpatterns = [
    path('', listar_view),
    path('<int:pk>/lida/', marcar_lida_view),
    path('marcar-todas/', marcar_todas_view),
]

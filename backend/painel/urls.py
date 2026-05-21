from django.urls import path
from .views import dashboard_view, agregacoes_view

urlpatterns = [
    path("dashboard/", dashboard_view),
    path("agregacoes/", agregacoes_view),
]
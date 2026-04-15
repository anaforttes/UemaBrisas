from django.urls import path
from .views import processos_view

urlpatterns = [
    path("", processos_view, name="processos"),
]
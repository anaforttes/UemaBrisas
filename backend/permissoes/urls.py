from django.urls import path
from .views import permissoes_view

urlpatterns = [
    path('', permissoes_view, name='permissoes'),
]

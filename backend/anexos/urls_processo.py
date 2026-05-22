from django.urls import path
from .views import anexos_processo

urlpatterns = [
    path('', anexos_processo),
]

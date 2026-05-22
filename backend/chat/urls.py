from django.urls import path
from .views import mensagens_view

urlpatterns = [
    path('', mensagens_view),
]

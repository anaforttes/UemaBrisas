from django.urls import path
from .views import aprovar_cargo

urlpatterns = [
    path("aprovar-cargo/", aprovar_cargo),
]
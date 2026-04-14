
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/autenticacao/', include('autenticacao.urls')),
    path('api/painel/', include('painel.urls')),
    path('api/equipe/', include('equipe.urls')),
    path('api/processos/', include('processos.urls')),
    path('api/permissoes/', include('permissoes.urls')),
]



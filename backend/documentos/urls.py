from django.urls import path
from .views import (
    DocumentoListView, DocumentoDetailView,
    SalvarVersaoView, VersaoListView, VersaoConteudoView,
    ColaboradorView, ColaboradorDeleteView,
    ComentarioListView, ComentarioUpdateView,
    AssinaturaListView, IniciarAssinaturasView,
    VerificarAssinaturaPublicaView,
    GerarConviteView, AceitarConviteView,
    AuditoriaListView, PresencaListView,
    ModeloListView, ModeloDetailView,
)

urlpatterns = [
    path('', DocumentoListView.as_view()),
    path('convite/<uuid:codigo>/', AceitarConviteView.as_view()),
    path('assinaturas/verificar/<str:protocolo>/', VerificarAssinaturaPublicaView.as_view()),
    path('<uuid:pk>/', DocumentoDetailView.as_view()),
    path('<uuid:doc_id>/salvar/', SalvarVersaoView.as_view()),
    path('<uuid:doc_id>/versoes/', VersaoListView.as_view()),
    path('<uuid:doc_id>/versoes/<int:versao_num>/', VersaoConteudoView.as_view()),
    path('<uuid:doc_id>/colaboradores/', ColaboradorView.as_view()),
    path('<uuid:doc_id>/colaboradores/<int:user_id>/', ColaboradorDeleteView.as_view()),
    path('<uuid:doc_id>/comentarios/', ComentarioListView.as_view()),
    path('<uuid:doc_id>/comentarios/<uuid:comentario_id>/', ComentarioUpdateView.as_view()),
    path('<uuid:doc_id>/assinaturas/', AssinaturaListView.as_view()),
    path('<uuid:doc_id>/assinaturas/iniciar/', IniciarAssinaturasView.as_view()),
    path('<uuid:doc_id>/convite/', GerarConviteView.as_view()),
    path('<uuid:doc_id>/auditoria/', AuditoriaListView.as_view()),
    path('<uuid:doc_id>/presenca/', PresencaListView.as_view()),
    path('modelos/', ModeloListView.as_view()),
    path('modelos/<uuid:pk>/', ModeloDetailView.as_view()),
]

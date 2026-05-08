from django.contrib import admin
from .models import Documento, ColaboradorDocumento, ComentarioDocumento, VersaoDocumento, AssinaturaDocumento

admin.site.register(Documento)
admin.site.register(ColaboradorDocumento)
admin.site.register(ComentarioDocumento)
admin.site.register(VersaoDocumento)
admin.site.register(AssinaturaDocumento)

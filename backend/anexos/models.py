from django.conf import settings
from django.db import models


class Anexo(models.Model):
    processo = models.ForeignKey(
        'processos.Processo',
        on_delete=models.CASCADE,
        related_name='anexos',
    )
    nome = models.CharField(max_length=255)
    tipo = models.CharField(max_length=100, blank=True, default='')
    tamanho = models.PositiveIntegerField(default=0)
    arquivo = models.FileField(upload_to='anexos/%Y/%m/')
    adicionado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='anexos',
    )
    etapa_numero  = models.PositiveSmallIntegerField(null=True, blank=True)
    adicionado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-adicionado_em']

    def __str__(self):
        return self.nome

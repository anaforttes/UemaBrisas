from django.db import models
from django.conf import settings


class MensagemChat(models.Model):
    usuario  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mensagens_chat',
    )
    texto     = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['criado_em']

    def __str__(self):
        return f'{self.usuario.name}: {self.texto[:50]}'

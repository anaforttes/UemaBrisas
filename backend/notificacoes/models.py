from django.db import models
from django.conf import settings


class Notificacao(models.Model):
    TIPOS = [
        ('comentario', 'Comentário'),
        ('colaborador', 'Colaborador'),
        ('conflito', 'Conflito de versão'),
        ('atribuicao', 'Atribuição'),
        ('assinatura', 'Assinatura'),
        ('sistema', 'Sistema'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificacoes',
    )
    tipo = models.CharField(max_length=20, choices=TIPOS, default='sistema')
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True, default='')
    lida = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, default='')
    convite = models.ForeignKey(
        'processos.ConviteAtribuicao',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='notificacoes',
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return f'[{self.tipo}] {self.titulo} → {self.usuario.email}'

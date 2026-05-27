from django.db import models
from django.conf import settings


class Etapa(models.Model):
    STATUS_CHOICES = [
        ('pendente',     'Pendente'),
        ('em_andamento', 'Em andamento'),
        ('concluida',    'Concluída'),
        ('bloqueada',    'Bloqueada'),
        ('cancelada',    'Cancelada'),
    ]
    EIXO_CHOICES = [
        ('Geral',      'Geral'),
        ('Técnico',    'Técnico'),
        ('Jurídico',   'Jurídico'),
        ('Social',     'Social'),
        ('Cartorial',  'Cartorial'),
    ]

    processo       = models.ForeignKey(
        'processos.Processo',
        on_delete=models.CASCADE,
        related_name='etapas',
    )
    numero         = models.PositiveSmallIntegerField()
    nome           = models.CharField(max_length=200)
    eixo           = models.CharField(max_length=20, choices=EIXO_CHOICES, default='Geral')
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    responsavel    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='etapas_responsavel',
    )
    observacoes    = models.TextField(blank=True, default='')
    data_inicio    = models.DateField(null=True, blank=True)
    data_conclusao = models.DateField(null=True, blank=True)
    prazo          = models.DateField(null=True, blank=True)
    depende_de     = models.JSONField(default=list, blank=True)

    class Meta:
        ordering       = ['numero']
        unique_together = ('processo', 'numero')

    def __str__(self):
        return f'{self.numero}. {self.nome} [{self.status}]'

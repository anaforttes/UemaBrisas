from django.db import models
from django.utils import timezone
from django.conf import settings


class Processo(models.Model):
    MODALIDADES = [
        ("REURB-S", "REURB-S"),
        ("REURB-E", "REURB-E"),
    ]

    STATUS_CHOICES = [
        ("Pendente",           "Pendente"),
        ("Em Andamento",       "Em Andamento"),
        ("Iniciado",           "Iniciado"),
        ("Levantamento Técnico", "Levantamento Técnico"),
        ("Análise Jurídica",   "Análise Jurídica"),
        ("Em Edital",          "Em Edital"),
        ("Diligência",         "Diligência"),
        ("Em Análise",         "Em Análise"),
        ("Aprovado",           "Aprovado"),
        ("Concluído",          "Concluído"),
        ("Finalizado",         "Finalizado"),
        ("Cancelado",          "Cancelado"),
        ("Arquivado",          "Arquivado"),
    ]

    # Identificação
    protocol        = models.CharField(max_length=20, unique=True, blank=True)
    protocolado     = models.BooleanField(default=False)

    # Dados principais
    title           = models.CharField(max_length=255)
    applicant       = models.CharField(max_length=255)
    modality        = models.CharField(max_length=20, choices=MODALIDADES, default="REURB-S")
    status          = models.CharField(max_length=50, choices=STATUS_CHOICES, default="Pendente")
    progress        = models.IntegerField(default=0)

    # Localização
    location        = models.CharField(max_length=255, blank=True, default="")
    municipio       = models.CharField(max_length=100, blank=True, default="")
    estado          = models.CharField(max_length=10,  blank=True, default="")
    area            = models.CharField(max_length=100, blank=True, default="")

    # Responsáveis
    responsible_name = models.CharField(max_length=255, blank=True, default="")
    technician_id    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='processos_tecnico',
        db_column='technician_id',
    )
    legal_id         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='processos_juridico',
        db_column='legal_id',
    )
    criado_por       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='processos_criados',
    )

    # Datas
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.protocol:
            ano = timezone.now().year
            ultimo = (
                Processo.objects.filter(protocol__endswith=f"-{ano}")
                .order_by("-id")
                .first()
            )
            if ultimo and ultimo.protocol:
                try:
                    num = int(ultimo.protocol.split("-")[0]) + 1
                except (ValueError, IndexError):
                    num = 1
            else:
                num = 1
            self.protocol = f"{str(num).zfill(4)}-{ano}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.protocol} — {self.title}"


class EventoProcesso(models.Model):
    TIPO_CHOICES = [
        ('arquivo_adicionado',  'Arquivo adicionado'),
        ('arquivo_removido',    'Arquivo removido'),
        ('etapa_status',        'Status de etapa alterado'),
        ('equipe_alterada',     'Equipe alterada'),
        ('status_alterado',     'Status alterado'),
        ('processo_criado',     'Processo criado'),
        ('processo_protocolado','Processo protocolado'),
    ]

    processo   = models.ForeignKey(Processo, on_delete=models.CASCADE, related_name='eventos')
    tipo       = models.CharField(max_length=30, choices=TIPO_CHOICES)
    descricao  = models.CharField(max_length=500)
    usuario    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='eventos_processo',
    )
    dados      = models.JSONField(default=dict, blank=True)
    criado_em  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.tipo} — {self.processo.protocol}'


class ConviteAtribuicao(models.Model):
    PAPEIS = [
        ('tecnico',  'Técnico'),
        ('juridico', 'Jurídico'),
    ]
    STATUS = [
        ('pendente',  'Pendente'),
        ('aceito',    'Aceito'),
        ('recusado',  'Recusado'),
        ('cancelado', 'Cancelado'),
    ]

    processo       = models.ForeignKey(Processo, on_delete=models.CASCADE, related_name='convites')
    papel          = models.CharField(max_length=10, choices=PAPEIS)
    convidado      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='convites_recebidos',
    )
    solicitado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='convites_enviados',
    )
    status         = models.CharField(max_length=10, choices=STATUS, default='pendente')
    criado_em      = models.DateTimeField(auto_now_add=True)
    respondido_em  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return f'Convite {self.papel} → {self.convidado_id} ({self.status})'

import uuid
from django.db import models
from autenticacao.models import CustomUser


class Documento(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Rascunho'),
        ('Review', 'Em Revisão'),
        ('Approved', 'Aprovado'),
        ('Signed', 'Assinado'),
        ('Finalizado', 'Finalizado'),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doc_ref   = models.CharField(max_length=200, blank=True, default='', db_index=True)
    titulo    = models.CharField(max_length=500)
    conteudo  = models.TextField(blank=True, default='')
    cabecalho = models.TextField(blank=True, default='')
    rodape    = models.TextField(blank=True, default='')
    processo_id  = models.CharField(max_length=100, blank=True, default='')
    criado_por   = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='documentos_criados')
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    versao_atual = models.PositiveIntegerField(default=1)
    criado_em    = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-atualizado_em']

    def __str__(self):
        return self.titulo


class ColaboradorDocumento(models.Model):
    PAPEL_CHOICES = [
        ('editor', 'Editor'),
        ('visualizador', 'Visualizador'),
    ]

    documento   = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='colaboradores')
    usuario     = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='colaboracoes')
    papel       = models.CharField(max_length=20, choices=PAPEL_CHOICES, default='editor')
    convidado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('documento', 'usuario')

    def __str__(self):
        return f'{self.usuario.name} → {self.documento.titulo} ({self.papel})'


class ComentarioDocumento(models.Model):
    TIPO_CHOICES   = [('comentario', 'Comentário'), ('sugestao', 'Sugestão')]
    STATUS_CHOICES = [('pendente', 'Pendente'), ('aceito', 'Aceito'), ('rejeitado', 'Rejeitado')]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    documento         = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='comentarios')
    autor             = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    texto             = models.TextField()
    tipo              = models.CharField(max_length=20, choices=TIPO_CHOICES, default='comentario')
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    texto_selecionado = models.TextField(blank=True, default='')
    pos_inicio        = models.IntegerField(null=True, blank=True)
    pos_fim           = models.IntegerField(null=True, blank=True)
    criado_em         = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']


class VersaoDocumento(models.Model):
    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='versoes')
    numero    = models.PositiveIntegerField()
    conteudo  = models.TextField()
    titulo    = models.CharField(max_length=500)
    autor     = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    descricao = models.CharField(max_length=300, blank=True, default='')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-numero']
        unique_together = ('documento', 'numero')


class AssinaturaDocumento(models.Model):
    STATUS_CHOICES = [('pendente', 'Pendente'), ('assinado', 'Assinado'), ('rejeitado', 'Rejeitado')]

    documento      = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='assinaturas')
    usuario        = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    ordem          = models.PositiveIntegerField(default=1)
    protocolo      = models.CharField(max_length=100, blank=True, default='')
    hash_assinatura = models.CharField(max_length=300, blank=True, default='')
    nome_certificado = models.CharField(max_length=200, blank=True, default='')
    cpf_certificado  = models.CharField(max_length=20, blank=True, default='')
    ac_emissora      = models.CharField(max_length=200, blank=True, default='')
    assinado_em      = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('documento', 'usuario')
        ordering = ['ordem']


class ConviteDocumento(models.Model):
    PAPEL_CHOICES = [('editor', 'Editor'), ('visualizador', 'Visualizador')]

    documento  = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='convites')
    criado_por = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    codigo     = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    papel      = models.CharField(max_length=20, choices=PAPEL_CHOICES, default='editor')
    criado_em  = models.DateTimeField(auto_now_add=True)
    expira_em  = models.DateTimeField()
    ativo      = models.BooleanField(default=True)
    usos       = models.PositiveIntegerField(default=0)
    max_usos   = models.PositiveIntegerField(default=50)

    def __str__(self):
        return f'Convite {self.codigo} → {self.documento.titulo}'


class AuditoriaDocumento(models.Model):
    TIPO_CHOICES = [
        ('criacao', 'Criação'),
        ('edicao', 'Edição'),
        ('comentario', 'Comentário'),
        ('assinatura', 'Assinatura'),
        ('finalizado', 'Finalizado'),
        ('colaborador_adicionado', 'Colaborador Adicionado'),
        ('colaborador_removido', 'Colaborador Removido'),
        ('status_alterado', 'Status Alterado'),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    documento = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='auditoria')
    tipo      = models.CharField(max_length=30, choices=TIPO_CHOICES)
    usuario   = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    descricao = models.TextField(blank=True)
    versao    = models.PositiveIntegerField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-criado_em']
        indexes = [models.Index(fields=['documento', '-criado_em'])]

    def __str__(self):
        return f'{self.tipo} em {self.documento.titulo} por {self.usuario}'


class ModeloDocumento(models.Model):
    TIPO_CHOICES = [
        ('Administrativo', 'Administrativo'),
        ('Notificação', 'Notificação'),
        ('Técnico', 'Técnico'),
        ('Titularidade', 'Titularidade'),
        ('Outro', 'Outro'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome        = models.CharField(max_length=300)
    tipo        = models.CharField(max_length=50, choices=TIPO_CHOICES, default='Outro')
    versao      = models.CharField(max_length=20, default='V1.0')
    descricao   = models.TextField(blank=True, default='')
    conteudo    = models.TextField()
    campos      = models.JSONField(default=list)
    criado_por  = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='modelos_criados')
    criado_em   = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-atualizado_em']

    def __str__(self):
        return f'{self.nome} ({self.versao})'


class PresencaDocumento(models.Model):
    documento     = models.ForeignKey(Documento, on_delete=models.CASCADE, related_name='presencas')
    usuario       = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    ultimo_acesso = models.DateTimeField(auto_now=True, db_index=True)
    cursor_pos    = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('documento', 'usuario')

    def __str__(self):
        return f'{self.usuario.name} em {self.documento.titulo}'

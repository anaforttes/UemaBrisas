from django.conf import settings
from django.db import models


class BaseTimestampModel(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class NivelAcesso(BaseTimestampModel):
    codigo = models.CharField(max_length=50, unique=True)
    nome = models.CharField(max_length=120)
    descricao = models.TextField(blank=True, default='')
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = 'controleadmin_nivel_acesso'
        ordering = ['nome']
        verbose_name = 'Nível de acesso'
        verbose_name_plural = 'Níveis de acesso'

    def __str__(self):
        return self.nome


class PermissaoSistema(BaseTimestampModel):
    codigo = models.CharField(max_length=80, unique=True)
    nome = models.CharField(max_length=120)
    descricao = models.TextField(blank=True, default='')
    modulo = models.CharField(max_length=60)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = 'controleadmin_permissao_sistema'
        ordering = ['modulo', 'nome']
        verbose_name = 'Permissão do sistema'
        verbose_name_plural = 'Permissões do sistema'

    def __str__(self):
        return f'{self.modulo}: {self.nome}'


class NivelAcessoPermissao(BaseTimestampModel):
    nivel_acesso = models.ForeignKey(
        NivelAcesso,
        on_delete=models.CASCADE,
        related_name='permissoes_padrao',
    )
    permissao = models.ForeignKey(
        PermissaoSistema,
        on_delete=models.CASCADE,
        related_name='niveis_vinculados',
    )

    class Meta:
        db_table = 'controleadmin_nivel_acesso_permissao'
        unique_together = ('nivel_acesso', 'permissao')
        verbose_name = 'Permissão padrão do nível'
        verbose_name_plural = 'Permissões padrão do nível'

    def __str__(self):
        return f'{self.nivel_acesso} -> {self.permissao.codigo}'


class PerfilAcessoUsuario(BaseTimestampModel):
    class StatusAcesso(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        ATIVO = 'ativo', 'Ativo'
        BLOQUEADO = 'bloqueado', 'Bloqueado'
        INATIVO = 'inativo', 'Inativo'

    class EscopoTipo(models.TextChoices):
        GLOBAL = 'global', 'Global'
        MUNICIPIO = 'municipio', 'Município'
        SETOR = 'setor', 'Setor'
        ATRIBUIDO = 'atribuido', 'Somente atribuídos'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil_acesso',
    )
    nivel_acesso = models.ForeignKey(
        NivelAcesso,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usuarios',
    )
    status_acesso = models.CharField(
        max_length=20,
        choices=StatusAcesso.choices,
        default=StatusAcesso.PENDENTE,
    )
    municipio = models.CharField(max_length=120, blank=True, default='')
    setor = models.CharField(max_length=120, blank=True, default='')
    escopo_tipo = models.CharField(
        max_length=20,
        choices=EscopoTipo.choices,
        default=EscopoTipo.ATRIBUIDO,
    )
    observacoes = models.TextField(blank=True, default='')
    aprovado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='aprovacoes_controleadmin',
    )
    aprovado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'controleadmin_perfil_acesso_usuario'
        ordering = ['user__name', 'user__email']
        verbose_name = 'Perfil de acesso do usuário'
        verbose_name_plural = 'Perfis de acesso dos usuários'

    def __str__(self):
        return f'{self.user.email} ({self.status_acesso})'


class UsuarioPermissaoExtra(BaseTimestampModel):
    perfil_acesso_usuario = models.ForeignKey(
        PerfilAcessoUsuario,
        on_delete=models.CASCADE,
        related_name='permissoes_extras',
    )
    permissao = models.ForeignKey(
        PermissaoSistema,
        on_delete=models.CASCADE,
        related_name='usuarios_com_excecao',
    )
    permitido = models.BooleanField(default=True)
    origem = models.CharField(max_length=40, default='manual')

    class Meta:
        db_table = 'controleadmin_usuario_permissao_extra'
        unique_together = ('perfil_acesso_usuario', 'permissao')
        verbose_name = 'Permissão extra do usuário'
        verbose_name_plural = 'Permissões extras dos usuários'

    def __str__(self):
        return f'{self.perfil_acesso_usuario.user.email} -> {self.permissao.codigo}'


class AuditoriaAdministrativa(models.Model):
    usuario_alvo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='auditorias_como_alvo',
    )
    administrador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='auditorias_administradas',
    )
    acao = models.CharField(max_length=80)
    detalhes = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'controleadmin_auditoria_administrativa'
        ordering = ['-criado_em']
        verbose_name = 'Auditoria administrativa'
        verbose_name_plural = 'Auditorias administrativas'

    def __str__(self):
        return f'{self.acao} - {self.criado_em:%d/%m/%Y %H:%M}'


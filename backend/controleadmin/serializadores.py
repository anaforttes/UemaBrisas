from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    AuditoriaAdministrativa,
    NivelAcesso,
    NivelAcessoPermissao,
    PerfilAcessoUsuario,
    PermissaoSistema,
    UsuarioPermissaoExtra,
)

User = get_user_model()


class UsuarioResumoSerializador(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()
    date_joined = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'is_active', 'date_joined', 'nome')

    def get_nome(self, obj):
        return getattr(obj, 'name', '') or obj.email

    def get_date_joined(self, obj):
        return getattr(obj, 'created_at', None)


class PermissaoSistemaSerializador(serializers.ModelSerializer):
    class Meta:
        model = PermissaoSistema
        fields = ('id', 'codigo', 'nome', 'descricao', 'modulo', 'ativo')


class NivelAcessoPermissaoSerializador(serializers.ModelSerializer):
    permissao = PermissaoSistemaSerializador(read_only=True)

    class Meta:
        model = NivelAcessoPermissao
        fields = ('id', 'permissao')


class NivelAcessoSerializador(serializers.ModelSerializer):
    permissoes_padrao = NivelAcessoPermissaoSerializador(many=True, read_only=True)

    class Meta:
        model = NivelAcesso
        fields = ('id', 'codigo', 'nome', 'descricao', 'ativo', 'permissoes_padrao')


class UsuarioPermissaoExtraSerializador(serializers.ModelSerializer):
    permissao = PermissaoSistemaSerializador(read_only=True)
    permissao_id = serializers.PrimaryKeyRelatedField(
        source='permissao',
        queryset=PermissaoSistema.objects.filter(ativo=True),
        write_only=True,
    )

    class Meta:
        model = UsuarioPermissaoExtra
        fields = ('id', 'permissao', 'permissao_id', 'permitido', 'origem')


class PerfilAcessoUsuarioSerializador(serializers.ModelSerializer):
    user = UsuarioResumoSerializador(read_only=True)
    nivel_acesso = NivelAcessoSerializador(read_only=True)
    nivel_acesso_id = serializers.PrimaryKeyRelatedField(
        source='nivel_acesso',
        queryset=NivelAcesso.objects.filter(ativo=True),
        write_only=True,
        required=False,
        allow_null=True,
    )
    permissoes_extras = UsuarioPermissaoExtraSerializador(many=True, read_only=True)

    class Meta:
        model = PerfilAcessoUsuario
        fields = (
            'id',
            'user',
            'nivel_acesso',
            'nivel_acesso_id',
            'status_acesso',
            'municipio',
            'setor',
            'escopo_tipo',
            'observacoes',
            'aprovado_em',
            'permissoes_extras',
            'criado_em',
            'atualizado_em',
        )


class PermissaoExtraEntradaSerializador(serializers.Serializer):
    permissao_id = serializers.PrimaryKeyRelatedField(queryset=PermissaoSistema.objects.filter(ativo=True))
    permitido = serializers.BooleanField(default=True)
    origem = serializers.CharField(required=False, allow_blank=True, default='manual')


class AtualizarPerfilAcessoSerializador(serializers.Serializer):
    nivel_acesso_id = serializers.PrimaryKeyRelatedField(
        queryset=NivelAcesso.objects.filter(ativo=True),
        required=False,
        allow_null=True,
    )
    status_acesso = serializers.ChoiceField(choices=PerfilAcessoUsuario.StatusAcesso.choices, required=False)
    municipio = serializers.CharField(required=False, allow_blank=True)
    setor = serializers.CharField(required=False, allow_blank=True)
    escopo_tipo = serializers.ChoiceField(choices=PerfilAcessoUsuario.EscopoTipo.choices, required=False)
    observacoes = serializers.CharField(required=False, allow_blank=True)
    permissoes_extras = PermissaoExtraEntradaSerializador(many=True, required=False)


class AuditoriaAdministrativaSerializador(serializers.ModelSerializer):
    usuario_alvo = UsuarioResumoSerializador(read_only=True)
    administrador = UsuarioResumoSerializador(read_only=True)

    class Meta:
        model = AuditoriaAdministrativa
        fields = ('id', 'usuario_alvo', 'administrador', 'acao', 'detalhes', 'ip', 'criado_em')

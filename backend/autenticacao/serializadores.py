from datetime import timedelta
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from .models import CustomUser


class LoginSerializador(serializers.Serializer):
    email    = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, allow_blank=False, write_only=True)


class LoginGoogleSerializador(serializers.Serializer):
    credential = serializers.CharField(required=True, allow_blank=False)


class SolicitarRecuperacaoSenhaSerializador(serializers.Serializer):
    email = serializers.EmailField(required=True)


class RedefinirSenhaSerializador(serializers.Serializer):
    uid          = serializers.CharField(required=True, allow_blank=False)
    token        = serializers.CharField(required=True, allow_blank=False)
    new_password = serializers.CharField(required=True, allow_blank=False, write_only=True)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(str(e))
        return value


class CadastroSerializador(serializers.Serializer):
    """Cadastro público: apenas nome, e-mail e senha. Cargo definido pelo admin."""
    email    = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    name     = serializers.CharField(required=True)

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(str(e))
        return value


class CustomUserSerializer(serializers.ModelSerializer):
    """
    Serializer de leitura de usuário.
    Permissões vêm do controleadmin — lidas via perfil_acesso.
    """
    status      = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    nivel_acesso = serializers.SerializerMethodField()
    status_acesso = serializers.SerializerMethodField()

    class Meta:
        model  = CustomUser
        fields = [
            'id', 'name', 'email', 'role',
            'nivel_acesso', 'status_acesso',
            'permissions',
            'is_active', 'last_access', 'status',
            'avatar', 'name_changed_at',
        ]

    def get_status(self, obj) -> str:
        return 'Online' if obj.is_online else 'Offline'

    def get_nivel_acesso(self, obj) -> str | None:
        """Retorna o código do nível de acesso via controleadmin."""
        try:
            perfil = obj.perfil_acesso
            return perfil.nivel_acesso.codigo if perfil.nivel_acesso else None
        except Exception:
            return None

    def get_status_acesso(self, obj) -> str:
        """Retorna o status de acesso (pendente/ativo/bloqueado/inativo)."""
        try:
            return obj.perfil_acesso.status_acesso
        except Exception:
            return 'pendente'

    def get_permissions(self, obj) -> dict:
        """
        Retorna as permissões efetivas do usuário via controleadmin.
        Superusuário e staff recebem tudo como True.
        """
        if obj.is_superuser or obj.is_staff:
            return {
                'visualizar': True, 'editor': True, 'comentar': True,
                'aprovar': True,    'assinar': True,  'exportar': True,
                'gerenciar_usuarios': True,
            }
        try:
            from controleadmin.servicos import usuario_possui_permissao_codigo
            codigos = [
                'visualizar', 'editor', 'comentar',
                'aprovar', 'assinar', 'exportar', 'gerenciar_usuarios',
            ]
            return {c: usuario_possui_permissao_codigo(obj, c) for c in codigos}
        except Exception:
            return {
                'visualizar': True,  'editor': False, 'comentar': False,
                'aprovar': False,     'assinar': False, 'exportar': False,
                'gerenciar_usuarios': False,
            }

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


NAME_CHANGE_COOLDOWN_DAYS = 30


class AtualizarUsuarioSerializer(serializers.ModelSerializer):
    """
    PATCH pelo administrador: atualiza cargo, avatar, nome e is_active.
    Nivel de acesso é gerenciado via /api/controleadmin/usuarios/<id>/.
    """
    class Meta:
        model  = CustomUser
        fields = ['role', 'name', 'is_active', 'avatar']
        extra_kwargs = {
            'role':      {'required': False},
            'name':      {'required': False},
            'is_active': {'required': False},
            'avatar':    {'required': False},
        }

    def validate_name(self, value):
        instance = self.instance
        if instance and value != instance.name:
            if instance.name_changed_at:
                proxima = instance.name_changed_at + timedelta(days=NAME_CHANGE_COOLDOWN_DAYS)
                if timezone.now() < proxima:
                    dias = (proxima - timezone.now()).days + 1
                    raise serializers.ValidationError(
                        f'Nome pode ser alterado a cada {NAME_CHANGE_COOLDOWN_DAYS} dias. '
                        f'Tente em {dias} dia(s).'
                    )
        return value

    def update(self, instance, validated_data):
        novo_nome = validated_data.get('name')
        if novo_nome and novo_nome != instance.name:
            instance.name_changed_at = timezone.now()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

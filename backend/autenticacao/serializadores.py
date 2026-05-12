from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import CustomUser

class LoginSerializador(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, allow_blank=False, write_only=True)


class LoginGoogleSerializador(serializers.Serializer):
    credential = serializers.CharField(required=True, allow_blank=False)


class SolicitarRecuperacaoSenhaSerializador(serializers.Serializer):
    email = serializers.EmailField(required=True)


class RedefinirSenhaSerializador(serializers.Serializer):
    uid = serializers.CharField(required=True, allow_blank=False)
    token = serializers.CharField(required=True, allow_blank=False)
    new_password = serializers.CharField(required=True, allow_blank=False, write_only=True)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(str(e))
        return value


class CadastroSerializador(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    name = serializers.CharField(required=True)
    role = serializers.ChoiceField(choices=['Admin', 'Gestor', 'Jurídico', 'Técnico', 'Auditor', 'Atendente'], required=False, default='Atendente')

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(str(e))
        return value


class CustomUserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'name', 'email', 'role', 'access_flags', 'permissions', 'is_active', 'last_access', 'status']

    def get_status(self, obj) -> str:
        return 'Online' if obj.is_online else 'Offline'

    def get_permissions(self, obj) -> dict:
        if obj.permissions_data:
            return obj.permissions_data
        return {'visualizar': True, 'editor': False, 'comentar': False, 'aprovar': False, 'assinar': False, 'exportar': False}

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


class AtualizarUsuarioSerializer(serializers.ModelSerializer):
    permissions = serializers.DictField(child=serializers.BooleanField(), required=False, write_only=True)

    class Meta:
        model = CustomUser
        fields = ['role', 'access_flags', 'permissions', 'name', 'is_active']
        extra_kwargs = {
            'role': {'required': False}, 'access_flags': {'required': False},
            'name': {'required': False}, 'is_active': {'required': False},
        }

    def update(self, instance, validated_data):
        permissions = validated_data.pop('permissions', None)
        if permissions is not None:
            instance.permissions_data = permissions
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
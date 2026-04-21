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
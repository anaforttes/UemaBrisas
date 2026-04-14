from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


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
        validate_password(value)
        return value


class CadastroSerializador(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    name = serializers.CharField(required=False, default='')

    def validate_password(self, value):
        validate_password(value)
        return value

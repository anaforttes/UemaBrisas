from rest_framework import serializers
from .models import CustomUser


class CustomUserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'name',
            'email',
            'role',
            'access_flags',
            'permissions',
            'is_active',
            'last_access',
            'status',
        ]

    def get_status(self, obj) -> str:
        return 'Online' if obj.is_online else 'Offline'

    def get_permissions(self, obj) -> dict:
        # Retorna permissions_data do banco; se vazio, retorna defaults seguros
        if obj.permissions_data:
            return obj.permissions_data
        return {
            'visualizar': True,
            'editor':     False,
            'comentar':   False,
            'aprovar':    False,
            'assinar':    False,
            'exportar':   False,
        }

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


class AtualizarUsuarioSerializer(serializers.ModelSerializer):
    """Serializer para PATCH — atualiza cargo, flags e permissões."""

    permissions = serializers.DictField(
        child=serializers.BooleanField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = CustomUser
        fields = ['role', 'access_flags', 'permissions', 'name', 'is_active']
        extra_kwargs = {
            'role':         {'required': False},
            'access_flags': {'required': False},
            'name':         {'required': False},
            'is_active':    {'required': False},
        }

    def update(self, instance, validated_data):
        permissions = validated_data.pop('permissions', None)
        if permissions is not None:
            instance.permissions_data = permissions
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

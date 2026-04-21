from rest_framework import serializers
from .models import CustomUser


class CustomUserSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'name',
            'email',
            'role',
            'access_flags',
            'is_active',
            'last_access',
            'status',
        ]

    def get_status(self, obj) -> str:
        return 'Online' if obj.is_online else 'Offline'

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user
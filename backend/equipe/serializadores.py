from rest_framework import serializers
from .models import Membro


class MembroSerializer(serializers.ModelSerializer):
    quota = serializers.SerializerMethodField()

    class Meta:
        model = Membro
        fields = [
            'id',
            'name',
            'email',
            'avatar',
            'role',
            'status',
            'last_login',
            'quota',
            'flags',
            'permissions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_quota(self, obj):
        return {
            'used': obj.quota_used,
            'limit': obj.quota_limit,
        }

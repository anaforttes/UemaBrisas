from rest_framework import serializers
from .models import Notificacao


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = ['id', 'tipo', 'titulo', 'descricao', 'lida', 'link', 'criado_em']
        read_only_fields = ['id', 'criado_em']

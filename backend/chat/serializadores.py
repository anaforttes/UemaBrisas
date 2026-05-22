from rest_framework import serializers
from .models import MensagemChat


class MensagemChatSerializer(serializers.ModelSerializer):
    usuario_id   = serializers.IntegerField(source='usuario.id', read_only=True)
    usuario_nome = serializers.CharField(source='usuario.name', read_only=True)

    class Meta:
        model  = MensagemChat
        fields = ['id', 'usuario_id', 'usuario_nome', 'texto', 'criado_em']
        read_only_fields = ['id', 'usuario_id', 'usuario_nome', 'criado_em']

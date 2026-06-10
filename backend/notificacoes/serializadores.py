from rest_framework import serializers
from .models import Notificacao


class NotificacaoSerializer(serializers.ModelSerializer):
    convite = serializers.SerializerMethodField()

    class Meta:
        model = Notificacao
        fields = ['id', 'tipo', 'titulo', 'descricao', 'lida', 'link', 'convite', 'criado_em']
        read_only_fields = ['id', 'criado_em']

    def get_convite(self, obj):
        if not obj.convite_id:
            return None
        c = obj.convite
        return {
            'id': c.id,
            'status': c.status,
            'papel': c.papel,
            'papel_display': c.get_papel_display(),
            'processo_id': c.processo_id,
            'processo_titulo': c.processo.title,
        }

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Etapa

User = get_user_model()


class EtapaSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.SerializerMethodField()
    responsavel_id   = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='responsavel',
        allow_null=True,
        required=False,
    )

    def get_responsavel_nome(self, obj):
        return obj.responsavel.name if obj.responsavel else None

    class Meta:
        model  = Etapa
        fields = [
            'id', 'processo_id', 'numero', 'nome', 'eixo',
            'status', 'responsavel_id', 'responsavel_nome',
            'observacoes', 'data_inicio', 'data_conclusao', 'prazo', 'depende_de',
        ]

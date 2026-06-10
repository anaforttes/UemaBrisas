from rest_framework import serializers
from .models import Processo, ConviteAtribuicao


class ProcessoSerializer(serializers.ModelSerializer):
    technician_name = serializers.SerializerMethodField()
    legal_name      = serializers.SerializerMethodField()

    def get_technician_name(self, obj):
        return obj.technician_id.name if obj.technician_id else None

    def get_legal_name(self, obj):
        return obj.legal_id.name if obj.legal_id else None

    class Meta:
        model = Processo
        fields = [
            "id",
            "protocol",
            "protocolado",
            "title",
            "applicant",
            "modality",
            "status",
            "progress",
            "location",
            "municipio",
            "estado",
            "area",
            "responsible_name",
            "technician_id",
            "technician_name",
            "legal_id",
            "legal_name",
            "criado_por_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "protocol", "criado_por_id", "created_at", "updated_at",
                            "technician_name", "legal_name"]

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O título do processo é obrigatório.")
        return value.strip()

    def validate_applicant(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("O requerente é obrigatório.")
        return value.strip()

    def validate_progress(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError("O progresso deve estar entre 0 e 100.")
        return value


class ConviteAtribuicaoSerializer(serializers.ModelSerializer):
    papel_display     = serializers.CharField(source='get_papel_display', read_only=True)
    convidado_nome    = serializers.SerializerMethodField()
    solicitante_nome  = serializers.SerializerMethodField()
    processo_titulo   = serializers.CharField(source='processo.title', read_only=True)
    processo_protocol = serializers.CharField(source='processo.protocol', read_only=True)

    class Meta:
        model = ConviteAtribuicao
        fields = [
            'id', 'processo', 'processo_titulo', 'processo_protocol',
            'papel', 'papel_display', 'convidado', 'convidado_nome',
            'solicitante_nome', 'status', 'criado_em', 'respondido_em',
        ]

    def get_convidado_nome(self, obj):
        return obj.convidado.name if obj.convidado else None

    def get_solicitante_nome(self, obj):
        return obj.solicitado_por.name if obj.solicitado_por else None

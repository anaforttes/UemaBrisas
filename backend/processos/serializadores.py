from rest_framework import serializers
from .models import Processo


class ProcessoSerializer(serializers.ModelSerializer):
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
            "legal_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "protocol", "created_at", "updated_at"]

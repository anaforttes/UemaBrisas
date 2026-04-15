from rest_framework import serializers
from .models import Processo


class ProcessoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Processo
        fields = "__all__"
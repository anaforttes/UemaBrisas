from django.db import models


class Processo(models.Model):
    MODALIDADES = [
        ("REURB-S", "REURB-S"),
        ("REURB-E", "REURB-E"),
    ]

    title = models.CharField(max_length=255)
    applicant = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, null=True)
    modality = models.CharField(max_length=20, choices=MODALIDADES)
    area = models.CharField(max_length=100, blank=True, null=True)
    responsible_name = models.CharField(max_length=255, blank=True, null=True)
    municipio = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=10, blank=True, null=True)
    technician_id = models.IntegerField(blank=True, null=True)
    legal_id = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
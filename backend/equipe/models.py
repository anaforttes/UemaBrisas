from django.db import models
from django.utils import timezone


class Membro(models.Model):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Gestor', 'Gestor'),
        ('Jurídico', 'Jurídico'),
        ('Técnico', 'Técnico'),
        ('Auditor', 'Auditor'),
        ('Atendente', 'Atendente'),
    ]

    STATUS_CHOICES = [
        ('Online', 'Online'),
        ('Offline', 'Offline'),
    ]

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    avatar = models.CharField(max_length=500, blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Atendente')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Offline')
    last_login = models.DateTimeField(null=True, blank=True)
    quota_used = models.IntegerField(default=0)
    quota_limit = models.IntegerField(default=100)
    flags = models.JSONField(default=dict, blank=True)
    permissions = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.email})"

    class Meta:
        verbose_name = 'Membro'
        verbose_name_plural = 'Membros'

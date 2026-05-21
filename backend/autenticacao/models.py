from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, name, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('Admin',     'Admin'),
        ('Gestor',    'Gestor'),
        ('Jurídico',  'Jurídico'),
        ('Técnico',   'Técnico'),
        ('Auditor',   'Auditor'),
        ('Atendente', 'Atendente'),
    ]

    email        = models.EmailField(unique=True)
    name         = models.CharField(max_length=255)
    role         = models.CharField(max_length=100, choices=ROLE_CHOICES, default='Atendente')
    access_flags = models.JSONField(default=dict)   # flags: superusuario, adminMunicipio, etc.
    permissions_data = models.JSONField(            # permissões: visualizar, editor, etc.
        default=dict,
        db_column='permissions_data',
    )
    avatar          = models.TextField(blank=True, default='')
    name_changed_at = models.DateTimeField(null=True, blank=True)
    last_access     = models.DateTimeField(null=True, blank=True)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return self.email

    @property
    def is_online(self) -> bool:
        """
        Fallback para o snapshot inicial do SSE.
        Considera online se o último heartbeat foi há menos de 35 segundos
        (intervalo do heartbeat é 25 s + margem de 10 s).
        last_access NÃO é apagado no logout — é registro histórico.
        O status em tempo real é controlado pelo SSE (logout_status / heartbeat).
        """
        if self.last_access:
            delta = timezone.now() - self.last_access
            return delta.total_seconds() < 35
        return False

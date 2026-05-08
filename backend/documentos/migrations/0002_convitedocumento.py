import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone
import datetime


class Migration(migrations.Migration):

    dependencies = [
        ('documentos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ConviteDocumento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)),
                ('papel', models.CharField(choices=[('editor', 'Editor'), ('visualizador', 'Visualizador')], default='editor', max_length=20)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('expira_em', models.DateTimeField()),
                ('ativo', models.BooleanField(default=True)),
                ('usos', models.PositiveIntegerField(default=0)),
                ('max_usos', models.PositiveIntegerField(default=50)),
                ('documento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='convites', to='documentos.documento')),
                ('criado_por', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]

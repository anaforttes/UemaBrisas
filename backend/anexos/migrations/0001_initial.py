from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('processos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Anexo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('nome', models.CharField(max_length=255)),
                ('tipo', models.CharField(blank=True, default='', max_length=100)),
                ('tamanho', models.PositiveIntegerField(default=0)),
                ('arquivo', models.FileField(upload_to='anexos/%Y/%m/')),
                ('adicionado_em', models.DateTimeField(auto_now_add=True)),
                ('adicionado_por', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='anexos',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('processo', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='anexos',
                    to='processos.processo',
                )),
            ],
            options={'ordering': ['-adicionado_em']},
        ),
    ]

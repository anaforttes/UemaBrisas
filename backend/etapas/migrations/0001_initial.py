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
            name='Etapa',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('numero', models.PositiveSmallIntegerField()),
                ('nome', models.CharField(max_length=200)),
                ('eixo', models.CharField(
                    choices=[('Geral', 'Geral'), ('Técnico', 'Técnico'), ('Jurídico', 'Jurídico'),
                             ('Social', 'Social'), ('Cartorial', 'Cartorial')],
                    default='Geral', max_length=20,
                )),
                ('status', models.CharField(
                    choices=[('pendente', 'Pendente'), ('em_andamento', 'Em andamento'),
                             ('concluida', 'Concluída'), ('bloqueada', 'Bloqueada'), ('cancelada', 'Cancelada')],
                    default='pendente', max_length=20,
                )),
                ('observacoes', models.TextField(blank=True, default='')),
                ('data_inicio', models.DateField(blank=True, null=True)),
                ('data_conclusao', models.DateField(blank=True, null=True)),
                ('depende_de', models.JSONField(blank=True, default=list)),
                ('processo', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='etapas',
                    to='processos.processo',
                )),
                ('responsavel', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='etapas_responsavel',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['numero'], 'unique_together': {('processo', 'numero')}},
        ),
    ]

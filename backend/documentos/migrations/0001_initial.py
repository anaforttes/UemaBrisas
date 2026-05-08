import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Documento',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('doc_ref', models.CharField(blank=True, db_index=True, default='', max_length=200)),
                ('titulo', models.CharField(max_length=500)),
                ('conteudo', models.TextField(blank=True, default='')),
                ('cabecalho', models.TextField(blank=True, default='')),
                ('rodape', models.TextField(blank=True, default='')),
                ('processo_id', models.CharField(blank=True, default='', max_length=100)),
                ('status', models.CharField(choices=[('Draft', 'Rascunho'), ('Review', 'Em Revisão'), ('Approved', 'Aprovado'), ('Signed', 'Assinado'), ('Finalizado', 'Finalizado')], default='Draft', max_length=20)),
                ('versao_atual', models.PositiveIntegerField(default=1)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('criado_por', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documentos_criados', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-atualizado_em']},
        ),
        migrations.CreateModel(
            name='ColaboradorDocumento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('papel', models.CharField(choices=[('editor', 'Editor'), ('visualizador', 'Visualizador')], default='editor', max_length=20)),
                ('convidado_em', models.DateTimeField(auto_now_add=True)),
                ('documento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='colaboradores', to='documentos.documento')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='colaboracoes', to=settings.AUTH_USER_MODEL)),
            ],
            options={'unique_together': {('documento', 'usuario')}},
        ),
        migrations.CreateModel(
            name='ComentarioDocumento',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('texto', models.TextField()),
                ('tipo', models.CharField(choices=[('comentario', 'Comentário'), ('sugestao', 'Sugestão')], default='comentario', max_length=20)),
                ('status', models.CharField(choices=[('pendente', 'Pendente'), ('aceito', 'Aceito'), ('rejeitado', 'Rejeitado')], default='pendente', max_length=20)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('autor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('documento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comentarios', to='documentos.documento')),
            ],
            options={'ordering': ['-criado_em']},
        ),
        migrations.CreateModel(
            name='VersaoDocumento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('numero', models.PositiveIntegerField()),
                ('conteudo', models.TextField()),
                ('titulo', models.CharField(max_length=500)),
                ('descricao', models.CharField(blank=True, default='', max_length=300)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('autor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('documento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versoes', to='documentos.documento')),
            ],
            options={'ordering': ['-numero'], 'unique_together': {('documento', 'numero')}},
        ),
        migrations.CreateModel(
            name='AssinaturaDocumento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pendente', 'Pendente'), ('assinado', 'Assinado'), ('rejeitado', 'Rejeitado')], default='pendente', max_length=20)),
                ('ordem', models.PositiveIntegerField(default=1)),
                ('protocolo', models.CharField(blank=True, default='', max_length=100)),
                ('hash_assinatura', models.CharField(blank=True, default='', max_length=300)),
                ('nome_certificado', models.CharField(blank=True, default='', max_length=200)),
                ('cpf_certificado', models.CharField(blank=True, default='', max_length=20)),
                ('ac_emissora', models.CharField(blank=True, default='', max_length=200)),
                ('assinado_em', models.DateTimeField(blank=True, null=True)),
                ('documento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assinaturas', to='documentos.documento')),
                ('usuario', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['ordem'], 'unique_together': {('documento', 'usuario')}},
        ),
    ]

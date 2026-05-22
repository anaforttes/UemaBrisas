from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditoriaAdministrativa',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('acao', models.CharField(max_length=80)),
                ('detalhes', models.JSONField(blank=True, default=dict)),
                ('ip', models.GenericIPAddressField(blank=True, null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('administrador', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='auditorias_administradas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Auditoria administrativa',
                'verbose_name_plural': 'Auditorias administrativas',
                'db_table': 'controleadmin_auditoria_administrativa',
                'ordering': ['-criado_em'],
            },
        ),
        migrations.CreateModel(
            name='NivelAcesso',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('codigo', models.CharField(max_length=50, unique=True)),
                ('nome', models.CharField(max_length=120)),
                ('descricao', models.TextField(blank=True, default='')),
                ('ativo', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Nível de acesso',
                'verbose_name_plural': 'Níveis de acesso',
                'db_table': 'controleadmin_nivel_acesso',
                'ordering': ['nome'],
            },
        ),
        migrations.CreateModel(
            name='PermissaoSistema',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('codigo', models.CharField(max_length=80, unique=True)),
                ('nome', models.CharField(max_length=120)),
                ('descricao', models.TextField(blank=True, default='')),
                ('modulo', models.CharField(max_length=60)),
                ('ativo', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Permissão do sistema',
                'verbose_name_plural': 'Permissões do sistema',
                'db_table': 'controleadmin_permissao_sistema',
                'ordering': ['modulo', 'nome'],
            },
        ),
        migrations.CreateModel(
            name='PerfilAcessoUsuario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('status_acesso', models.CharField(choices=[('pendente', 'Pendente'), ('ativo', 'Ativo'), ('bloqueado', 'Bloqueado'), ('inativo', 'Inativo')], default='pendente', max_length=20)),
                ('municipio', models.CharField(blank=True, default='', max_length=120)),
                ('setor', models.CharField(blank=True, default='', max_length=120)),
                ('escopo_tipo', models.CharField(choices=[('global', 'Global'), ('municipio', 'Município'), ('setor', 'Setor'), ('atribuido', 'Somente atribuídos')], default='atribuido', max_length=20)),
                ('observacoes', models.TextField(blank=True, default='')),
                ('aprovado_em', models.DateTimeField(blank=True, null=True)),
                ('aprovado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='aprovacoes_controleadmin', to=settings.AUTH_USER_MODEL)),
                ('nivel_acesso', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='usuarios', to='controleadmin.nivelacesso')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='perfil_acesso', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Perfil de acesso do usuário',
                'verbose_name_plural': 'Perfis de acesso dos usuários',
                'db_table': 'controleadmin_perfil_acesso_usuario',
                'ordering': ['user__first_name', 'user__email'],
            },
        ),
        migrations.CreateModel(
            name='NivelAcessoPermissao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('nivel_acesso', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permissoes_padrao', to='controleadmin.nivelacesso')),
                ('permissao', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='niveis_vinculados', to='controleadmin.permissaosistema')),
            ],
            options={
                'verbose_name': 'Permissão padrão do nível',
                'verbose_name_plural': 'Permissões padrão do nível',
                'db_table': 'controleadmin_nivel_acesso_permissao',
                'unique_together': {('nivel_acesso', 'permissao')},
            },
        ),
        migrations.CreateModel(
            name='UsuarioPermissaoExtra',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('permitido', models.BooleanField(default=True)),
                ('origem', models.CharField(default='manual', max_length=40)),
                ('perfil_acesso_usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permissoes_extras', to='controleadmin.perfilacessousuario')),
                ('permissao', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usuarios_com_excecao', to='controleadmin.permissaosistema')),
            ],
            options={
                'verbose_name': 'Permissão extra do usuário',
                'verbose_name_plural': 'Permissões extras dos usuários',
                'db_table': 'controleadmin_usuario_permissao_extra',
                'unique_together': {('perfil_acesso_usuario', 'permissao')},
            },
        ),
        migrations.AddField(
            model_name='auditoriaadministrativa',
            name='usuario_alvo',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='auditorias_como_alvo', to=settings.AUTH_USER_MODEL),
        ),
    ]


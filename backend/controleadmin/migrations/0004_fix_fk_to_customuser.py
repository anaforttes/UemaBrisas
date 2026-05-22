from django.db import migrations


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ('controleadmin', '0003_alter_perfilacessousuario_options'),
    ]

    operations = [
        # Remove FKs antigas apontando para auth_user
        migrations.RunSQL(
            sql="""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_user_id_adcc6c41_fk_auth_user;
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_aprovado_por_id_9b82a00f_fk_auth_user;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Limpa dados órfãos em cascata
        migrations.RunSQL(
            sql="""
            DELETE FROM controleadmin_usuario_permissao_extra
            WHERE perfil_acesso_usuario_id IN (
                SELECT id FROM controleadmin_perfil_acesso_usuario
                WHERE user_id NOT IN (SELECT id FROM autenticacao_customuser)
            );

            DELETE FROM controleadmin_perfil_acesso_usuario
            WHERE user_id NOT IN (SELECT id FROM autenticacao_customuser);

            UPDATE controleadmin_perfil_acesso_usuario
            SET aprovado_por_id = NULL
            WHERE aprovado_por_id IS NOT NULL
              AND aprovado_por_id NOT IN (SELECT id FROM autenticacao_customuser);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Adiciona FK user_id correta
        migrations.RunSQL(
            sql="""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                ADD CONSTRAINT controleadmin_perfil_user_id_fk_customuser
                FOREIGN KEY (user_id)
                REFERENCES autenticacao_customuser(id)
                ON DELETE CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Adiciona FK aprovado_por_id correta
        migrations.RunSQL(
            sql="""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                ADD CONSTRAINT controleadmin_perfil_aprovado_por_id_fk_customuser
                FOREIGN KEY (aprovado_por_id)
                REFERENCES autenticacao_customuser(id)
                ON DELETE SET NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

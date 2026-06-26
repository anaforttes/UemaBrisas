from django.db import migrations


def _fix_fks(apps, schema_editor):
    # Correções de FK em nível de banco só fazem sentido no Postgres.
    # No SQLite (usado em testes e fallback local) é no-op: o schema já é
    # criado correto a partir do estado das migrations.
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        # Remove FKs antigas apontando para auth_user
        cursor.execute("""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_user_id_adcc6c41_fk_auth_user;
        """)
        cursor.execute("""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_aprovado_por_id_9b82a00f_fk_auth_user;
        """)

        # Limpa dados órfãos em cascata
        cursor.execute("""
            DELETE FROM controleadmin_usuario_permissao_extra
            WHERE perfil_acesso_usuario_id IN (
                SELECT id FROM controleadmin_perfil_acesso_usuario
                WHERE user_id NOT IN (SELECT id FROM autenticacao_customuser)
            );
        """)
        cursor.execute("""
            DELETE FROM controleadmin_perfil_acesso_usuario
            WHERE user_id NOT IN (SELECT id FROM autenticacao_customuser);
        """)
        cursor.execute("""
            UPDATE controleadmin_perfil_acesso_usuario
            SET aprovado_por_id = NULL
            WHERE aprovado_por_id IS NOT NULL
              AND aprovado_por_id NOT IN (SELECT id FROM autenticacao_customuser);
        """)

        # Adiciona FK user_id correta
        cursor.execute("""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                ADD CONSTRAINT controleadmin_perfil_user_id_fk_customuser
                FOREIGN KEY (user_id)
                REFERENCES autenticacao_customuser(id)
                ON DELETE CASCADE;
        """)

        # Adiciona FK aprovado_por_id correta
        cursor.execute("""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                ADD CONSTRAINT controleadmin_perfil_aprovado_por_id_fk_customuser
                FOREIGN KEY (aprovado_por_id)
                REFERENCES autenticacao_customuser(id)
                ON DELETE SET NULL;
        """)


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ('controleadmin', '0003_alter_perfilacessousuario_options'),
    ]

    operations = [
        migrations.RunPython(_fix_fks, migrations.RunPython.noop),
    ]

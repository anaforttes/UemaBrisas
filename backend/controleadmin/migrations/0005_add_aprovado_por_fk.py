from django.db import migrations


def _fix_aprovado_por_fk(apps, schema_editor):
    # Só Postgres: no SQLite o schema já é criado correto a partir do estado.
    if schema_editor.connection.vendor != 'postgresql':
        return

    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_aprovado_por_id_9b82a00f_fk_auth_user;
        """)
        cursor.execute("""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_aprovado_por_id_fk_customuser;
        """)

        cursor.execute("""
            UPDATE controleadmin_perfil_acesso_usuario
            SET aprovado_por_id = NULL
            WHERE aprovado_por_id IS NOT NULL
              AND aprovado_por_id NOT IN (SELECT id FROM autenticacao_customuser);
        """)

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
        ('controleadmin', '0004_fix_fk_to_customuser'),
    ]

    operations = [
        migrations.RunPython(_fix_aprovado_por_fk, migrations.RunPython.noop),
    ]

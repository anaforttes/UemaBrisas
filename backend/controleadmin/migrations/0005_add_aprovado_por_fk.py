from django.db import migrations


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ('controleadmin', '0004_fix_fk_to_customuser'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_aprovado_por_id_9b82a00f_fk_auth_user;
            ALTER TABLE controleadmin_perfil_acesso_usuario
                DROP CONSTRAINT IF EXISTS controleadmin_perfil_aprovado_por_id_fk_customuser;

            UPDATE controleadmin_perfil_acesso_usuario
            SET aprovado_por_id = NULL
            WHERE aprovado_por_id IS NOT NULL
              AND aprovado_por_id NOT IN (SELECT id FROM autenticacao_customuser);

            ALTER TABLE controleadmin_perfil_acesso_usuario
                ADD CONSTRAINT controleadmin_perfil_aprovado_por_id_fk_customuser
                FOREIGN KEY (aprovado_por_id)
                REFERENCES autenticacao_customuser(id)
                ON DELETE SET NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

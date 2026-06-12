# Generated to repair Neon schemas where 0001 was marked as applied without
# physically creating the access_flags column.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('autenticacao', '0007_perfil_template'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE autenticacao_customuser
                ADD COLUMN IF NOT EXISTS access_flags jsonb NOT NULL DEFAULT '{}'::jsonb;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

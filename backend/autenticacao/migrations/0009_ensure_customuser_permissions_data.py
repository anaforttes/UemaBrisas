# Generated to repair Neon schemas where 0002 was marked as applied without
# physically creating the permissions_data column.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('autenticacao', '0008_ensure_customuser_access_flags'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE autenticacao_customuser
                ADD COLUMN IF NOT EXISTS permissions_data jsonb NOT NULL DEFAULT '{}'::jsonb;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

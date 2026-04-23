from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('autenticacao', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='permissions_data',
            field=models.JSONField(default=dict, db_column='permissions_data'),
        ),
    ]

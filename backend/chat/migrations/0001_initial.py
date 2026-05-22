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
            name='MensagemChat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('texto', models.TextField()),
                ('criado_em', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mensagens_chat',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['criado_em']},
        ),
    ]

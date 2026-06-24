from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_approved',
            field=models.BooleanField(
                default=True,
                help_text=(
                    'For parking_owner accounts: False = pending admin approval. '
                    'True for all other roles (auto-approved on register).'
                ),
            ),
        ),
    ]

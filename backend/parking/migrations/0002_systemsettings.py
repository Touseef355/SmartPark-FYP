from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('parking', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SystemSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('grace_period_minutes',     models.IntegerField(default=10)),
                ('overstay_rate_per_hour',   models.DecimalField(decimal_places=2, default=20.0, max_digits=8)),
                ('reservation_lock_minutes', models.IntegerField(default=10)),
                ('max_booking_days',         models.IntegerField(default=7)),
                ('cash_enabled',             models.BooleanField(default=True)),
                ('easypaisa_enabled',        models.BooleanField(default=True)),
                ('card_enabled',             models.BooleanField(default=True)),
                ('refund_100_before_start',  models.BooleanField(default=True)),
                ('refund_percent',           models.IntegerField(default=50)),
                ('refund_window_minutes',    models.IntegerField(default=30)),
                ('notify_new_owner',         models.BooleanField(default=True)),
                ('notify_overstay',          models.BooleanField(default=True)),
                ('notify_payment_received',  models.BooleanField(default=True)),
                ('notify_manual_override',   models.BooleanField(default=False)),
                ('require_phone_otp',        models.BooleanField(default=True)),
                ('session_timeout_minutes',  models.IntegerField(default=60)),
                ('max_login_attempts',       models.IntegerField(default=5)),
                ('show_confidence_score',    models.BooleanField(default=True)),
                ('show_owner_revenue',       models.BooleanField(default=True)),
                ('updated_at',               models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'system_settings',
            },
        ),
    ]

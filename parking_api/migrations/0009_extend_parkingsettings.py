from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("parking_api", "0008_parkingsettings"),
    ]

    operations = [
        migrations.AddField(
            model_name="parkingsettings",
            name="address",
            field=models.CharField(
                blank=True,
                default="تهران، خیابان ولیعصر، پلاک 123",
                max_length=500,
                verbose_name="آدرس",
            ),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="auto_dark_mode",
            field=models.BooleanField(default=True, verbose_name="حالت تاریک خودکار"),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="contact_phone",
            field=models.CharField(
                blank=True,
                default="021-12345678",
                max_length=30,
                verbose_name="شماره تماس",
            ),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="notification_email",
            field=models.EmailField(
                blank=True,
                default="",
                max_length=254,
                verbose_name="ایمیل گزارشات",
            ),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="notify_capacity_full",
            field=models.BooleanField(default=True, verbose_name="اعلان ظرفیت کامل"),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="notify_daily_revenue",
            field=models.BooleanField(default=False, verbose_name="اعلان درآمد روزانه"),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="notify_vehicle_entry",
            field=models.BooleanField(default=True, verbose_name="اعلان ورود خودرو"),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="notify_vehicle_exit",
            field=models.BooleanField(default=True, verbose_name="اعلان خروج خودرو"),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="parking_name",
            field=models.CharField(
                default="پارکینگ هوشمند",
                max_length=200,
                verbose_name="نام پارکینگ",
            ),
        ),
        migrations.AddField(
            model_name="parkingsettings",
            name="show_help",
            field=models.BooleanField(default=True, verbose_name="نمایش راهنما"),
        ),
    ]

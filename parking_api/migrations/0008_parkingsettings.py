from django.db import migrations, models


def seed_parking_settings(apps, schema_editor):
    ParkingSettings = apps.get_model("parking_api", "ParkingSettings")
    ParkingSpot = apps.get_model("parking_api", "ParkingSpot")

    if ParkingSettings.objects.exists():
        return

    capacity = ParkingSpot.objects.exclude(status="disabled").count() or 50
    ParkingSettings.objects.create(pk=1, total_capacity=capacity)


class Migration(migrations.Migration):

    dependencies = [
        ("parking_api", "0007_seed_parking_spots"),
    ]

    operations = [
        migrations.CreateModel(
            name="ParkingSettings",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "total_capacity",
                    models.PositiveIntegerField(
                        default=50,
                        verbose_name="ظرفیت کل پارکینگ",
                    ),
                ),
            ],
            options={
                "verbose_name": "تنظیمات پارکینگ",
                "verbose_name_plural": "تنظیمات پارکینگ",
            },
        ),
        migrations.RunPython(seed_parking_settings, migrations.RunPython.noop),
    ]

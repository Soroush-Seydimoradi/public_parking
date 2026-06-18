from django.db import migrations


def seed_parking_spots(apps, schema_editor):
    ParkingSpot = apps.get_model("parking_api", "ParkingSpot")

    if ParkingSpot.objects.exists():
        return

    spots = []
    for index in range(50):
        spot_number = f"{chr(65 + index // 10)}-{index % 10 + 1}"
        spots.append(
            ParkingSpot(
                spot_number=spot_number,
                status="available",
                floor=1,
            )
        )

    ParkingSpot.objects.bulk_create(spots)


def unseed_parking_spots(apps, schema_editor):
    ParkingSpot = apps.get_model("parking_api", "ParkingSpot")
    ParkingSpot.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("parking_api", "0006_vehicletraffic_parking_spot"),
    ]

    operations = [
        migrations.RunPython(seed_parking_spots, unseed_parking_spots),
    ]

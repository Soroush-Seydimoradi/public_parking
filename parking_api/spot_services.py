from django.db import transaction

from .models import ParkingSpot, VehicleTraffic


class SpotNotAvailableError(Exception):
    pass


class SpotAssignmentError(Exception):
    pass


def assign_parking_spot(traffic: VehicleTraffic, spot: ParkingSpot) -> None:
    if spot.status != "available":
        raise SpotNotAvailableError("این جایگاه در حال حاضر قابل اختصاص نیست.")

    if VehicleTraffic.objects.filter(parking_spot=spot, is_inside=True).exists():
        raise SpotNotAvailableError("این جایگاه قبلاً به خودروی دیگری اختصاص یافته است.")

    traffic.parking_spot = spot
    traffic.save(update_fields=["parking_spot"])
    spot.status = "occupied"
    spot.save(update_fields=["status"])


def release_parking_spot(traffic: VehicleTraffic) -> None:
    spot = traffic.parking_spot
    if spot is None:
        return

    spot.status = "available"
    spot.save(update_fields=["status"])


@transaction.atomic
def assign_spot_for_entry(traffic: VehicleTraffic, spot_id: int) -> VehicleTraffic:
    spot = ParkingSpot.objects.select_for_update().get(pk=spot_id)
    assign_parking_spot(traffic, spot)
    return traffic

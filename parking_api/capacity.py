from .models import ParkingSettings, ParkingSpot, VehicleTraffic


def get_parking_capacity() -> int:
    return ParkingSettings.get_capacity()


def get_available_spot_count() -> int:
    return ParkingSpot.objects.filter(status="available").count()


def get_vehicles_inside_count() -> int:
    return VehicleTraffic.objects.filter(is_inside=True).count()


def is_parking_at_capacity() -> bool:
    return get_vehicles_inside_count() >= get_parking_capacity()

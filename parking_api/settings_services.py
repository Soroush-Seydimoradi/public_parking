from .models import ParkingSettings
from .settings_serializers import ParkingSettingsSerializer


def settings_to_response(settings: ParkingSettings) -> dict:
    return ParkingSettingsSerializer(
        {
            "parking_name": settings.parking_name,
            "address": settings.address,
            "phone": settings.contact_phone,
            "total_capacity": settings.total_capacity,
            "auto_dark_mode": settings.auto_dark_mode,
            "show_help": settings.show_help,
            "notify_vehicle_entry": settings.notify_vehicle_entry,
            "notify_vehicle_exit": settings.notify_vehicle_exit,
            "notify_capacity_full": settings.notify_capacity_full,
            "notify_daily_revenue": settings.notify_daily_revenue,
            "notification_email": settings.notification_email,
        }
    ).data


def apply_settings_update(settings: ParkingSettings, validated_data: dict) -> ParkingSettings:
    field_map = {
        "phone": "contact_phone",
    }

    for key, value in validated_data.items():
        model_field = field_map.get(key, key)
        setattr(settings, model_field, value)

    settings.save()
    return settings

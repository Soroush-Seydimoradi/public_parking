from rest_framework import serializers

from .capacity import get_vehicles_inside_count


class ParkingSettingsSerializer(serializers.Serializer):
    parking_name = serializers.CharField(max_length=200)
    address = serializers.CharField(max_length=500, allow_blank=True)
    phone = serializers.CharField(max_length=30, allow_blank=True)
    total_capacity = serializers.IntegerField(min_value=1, max_value=10000)
    auto_dark_mode = serializers.BooleanField()
    show_help = serializers.BooleanField()
    notify_vehicle_entry = serializers.BooleanField()
    notify_vehicle_exit = serializers.BooleanField()
    notify_capacity_full = serializers.BooleanField()
    notify_daily_revenue = serializers.BooleanField()
    notification_email = serializers.EmailField(allow_blank=True, required=False, default="")

    def validate_parking_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("نام پارکینگ الزامی است.")
        return name

    def validate_total_capacity(self, value):
        vehicles_inside = get_vehicles_inside_count()
        if value < vehicles_inside:
            raise serializers.ValidationError(
                "ظرفیت نمی‌تواند کمتر از تعداد خودروهای داخل پارکینگ باشد."
            )
        return value


class ParkingSettingsUpdateSerializer(ParkingSettingsSerializer):
    parking_name = serializers.CharField(max_length=200, required=False)
    address = serializers.CharField(max_length=500, allow_blank=True, required=False)
    phone = serializers.CharField(max_length=30, allow_blank=True, required=False)
    total_capacity = serializers.IntegerField(min_value=1, max_value=10000, required=False)
    auto_dark_mode = serializers.BooleanField(required=False)
    show_help = serializers.BooleanField(required=False)
    notify_vehicle_entry = serializers.BooleanField(required=False)
    notify_vehicle_exit = serializers.BooleanField(required=False)
    notify_capacity_full = serializers.BooleanField(required=False)
    notify_daily_revenue = serializers.BooleanField(required=False)
    notification_email = serializers.EmailField(allow_blank=True, required=False)

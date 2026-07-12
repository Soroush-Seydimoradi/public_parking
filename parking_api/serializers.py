import re

from rest_framework import serializers
from django.utils import timezone

from .models import ParkingSpot, Tariff, VehicleTraffic
from .models import OperatorShift
from django.contrib.auth.models import User
from .models import UserProfile

# فرمت پلاک: XX حرف YYY ایران ZZ  (مثال: 12 الف 345 ایران 67)
PLATE_PATTERN = re.compile(r"^(\d{2})\s+([\u0600-\u06FF]+)\s+(\d{3})\s+ایران\s+(\d{2})$")

MIN_PREFIX = 11
MIN_MIDDLE = 111
MIN_SUFFIX = 10


class TariffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tariff
        fields = '__all__'


class ParkingSpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSpot
        fields = '__all__'


class VehicleTrafficSerializer(serializers.ModelSerializer):
    tariff_details = TariffSerializer(source='tariff', read_only=True)
    parking_spot_details = ParkingSpotSerializer(source='parking_spot', read_only=True)
    entry_time_formatted = serializers.SerializerMethodField()
    exit_time_formatted = serializers.SerializerMethodField()

    class Meta:
        model = VehicleTraffic
        fields = [
            'id',
            'plate_number',
            'entry_time',
            'exit_time',
            'entry_time_formatted',
            'exit_time_formatted',
            'tariff',
            'tariff_details',
            'parking_spot',
            'parking_spot_details',
            'total_cost',
            'is_inside',
        ]

    def validate_plate_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("پلاک خودرو الزامی است.")

        # نرمال‌سازی فاصله‌های چندگانه
        normalized = re.sub(r"\s+", " ", value)

        match = PLATE_PATTERN.match(normalized)
        if not match:
            raise serializers.ValidationError(
                "فرمت پلاک نامعتبر است. مثال صحیح: 12 الف 345 ایران 67"
            )

        prefix, _letter, middle, suffix = match.groups()

        if int(prefix) < MIN_PREFIX:
            raise serializers.ValidationError(
                f"دو رقم اول پلاک نمی‌تواند کمتر از {MIN_PREFIX} باشد."
            )

        if int(middle) < MIN_MIDDLE:
            raise serializers.ValidationError(
                f"سه رقم وسط پلاک نمی‌تواند کمتر از {MIN_MIDDLE} باشد."
            )

        if int(suffix) < MIN_SUFFIX:
            raise serializers.ValidationError(
                f"دو رقم شناسه ایران نمی‌تواند کمتر از {MIN_SUFFIX} باشد."
            )

        return normalized

    def get_entry_time_formatted(self, obj):
        return timezone.localtime(obj.entry_time).strftime("%H:%M") if obj.entry_time else ""

    def get_exit_time_formatted(self, obj):
        return timezone.localtime(obj.exit_time).strftime("%H:%M") if obj.exit_time else ""


class OperatorShiftSerializer(serializers.ModelSerializer):
    operator_name = serializers.SerializerMethodField()

    class Meta:
        model = OperatorShift
        fields = '__all__'

    def get_operator_name(self, obj):
        if obj.operator:
            return obj.operator.get_full_name() or obj.operator.username
        return obj.operator_name_fallback


class UserListSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    phone = serializers.CharField(source='profile.phone', read_only=True)
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'email', 'role', 'phone', 'last_login', 'is_active', 'avatar']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_avatar(self, obj):
        name = obj.get_full_name() or obj.username
        return name[:2] if name else "US"
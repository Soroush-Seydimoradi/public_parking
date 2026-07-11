from rest_framework import serializers
from django.utils import timezone

from .models import ParkingSpot, Tariff, VehicleTraffic
from .models import OperatorShift
from django.contrib.auth.models import User
from .models import UserProfile


class TariffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tariff
        fields = 'all'


class ParkingSpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSpot
        fields = 'all'


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
        return value

    def get_entry_time_formatted(self, obj):
        return timezone.localtime(obj.entry_time).strftime("%H:%M") if obj.entry_time else ""

    def get_exit_time_formatted(self, obj):
        return timezone.localtime(obj.exit_time).strftime("%H:%M") if obj.exit_time else ""


class OperatorShiftSerializer(serializers.ModelSerializer):
    operator_name = serializers.SerializerMethodField()

    class Meta:
        model = OperatorShift
        fields = 'all'

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
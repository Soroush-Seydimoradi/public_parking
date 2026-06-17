from rest_framework import serializers
from .models import Tariff, VehicleTraffic
from .models import ParkingSpot
from .models import OperatorShift
from django.contrib.auth.models import User
from .models import UserProfile

class TariffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tariff
        fields = '__all__'

class VehicleTrafficSerializer(serializers.ModelSerializer):
    # این خط باعث می‌شود تمام جزییات تعرفه (مثل نام و قیمت‌ها) به صورت آبجکت تودرتو در فرانت لود شود
    tariff_details = TariffSerializer(source='tariff', read_only=True)
    
    # فرمت کردن زمان‌ها به زبان ساده برای نمایش راحت در ری‌آکت
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
            'total_cost', 
            'is_inside'
        ]

    def get_entry_time_formatted(self, obj):
        return obj.entry_time.strftime("%H:%M") if obj.entry_time else ""

    def get_exit_time_formatted(self, obj):
        return obj.exit_time.strftime("%H:%M") if obj.exit_time else ""

class ParkingSpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSpot
        fields = '__all__'

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
from django.contrib import admin
from .models import ParkingSettings, Tariff, VehicleTraffic

admin.site.register(Tariff)
admin.site.register(VehicleTraffic)


@admin.register(ParkingSettings)
class ParkingSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not ParkingSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

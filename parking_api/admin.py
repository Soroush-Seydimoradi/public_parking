from django.contrib import admin
from .models import ParkingSettings, Tariff, VehicleTraffic

admin.site.register(Tariff)
admin.site.register(VehicleTraffic)


@admin.register(ParkingSettings)
class ParkingSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("اطلاعات عمومی", {"fields": ("parking_name", "address", "contact_phone", "total_capacity")}),
        ("نمایش", {"fields": ("auto_dark_mode", "show_help")}),
        ("اعلان‌ها", {
            "fields": (
                "notify_vehicle_entry",
                "notify_vehicle_exit",
                "notify_capacity_full",
                "notify_daily_revenue",
                "notification_email",
            )
        }),
    )

    def has_add_permission(self, request):
        return not ParkingSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

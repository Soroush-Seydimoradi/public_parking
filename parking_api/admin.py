from django.contrib import admin

from .models import (
    OperatorShift,
    ParkingSettings,
    ParkingSpot,
    Tariff,
    UserProfile,
    VehicleTraffic,
)


class TariffAdmin(admin.ModelAdmin):
    list_display = ("name", "base_rate", "hourly_rate", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


class ParkingSpotAdmin(admin.ModelAdmin):
    list_display = ("spot_number", "floor", "status")
    list_filter = ("status", "floor")
    search_fields = ("spot_number",)
    ordering = ("floor", "spot_number")


class VehicleTrafficAdmin(admin.ModelAdmin):
    list_display = (
        "plate_number",
        "tariff",
        "parking_spot",
        "entry_time",
        "exit_time",
        "total_cost",
        "is_inside",
    )
    list_filter = ("is_inside", "tariff", "parking_spot")
    search_fields = ("plate_number", "parking_spot__spot_number")
    date_hierarchy = "entry_time"
    ordering = ("-entry_time",)


class OperatorShiftAdmin(admin.ModelAdmin):
    list_display = (
        "operator_name_fallback",
        "operator",
        "start_time",
        "end_time",
        "status",
        "revenue",
        "vehicles_entered",
        "vehicles_exited",
    )
    list_filter = ("status", "operator")
    search_fields = ("operator__username", "operator_name_fallback")
    date_hierarchy = "start_time"
    ordering = ("-start_time",)


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "role")
    list_filter = ("role",)
    search_fields = ("user__username", "user__first_name", "user__last_name", "phone")


class ParkingSettingsAdmin(admin.ModelAdmin):
    list_display = ("parking_name", "contact_phone", "total_capacity")
    fieldsets = (
        ("اطلاعات عمومی", {"fields": ("parking_name", "address", "contact_phone", "total_capacity")}),
        ("نمایش", {"fields": ("auto_dark_mode", "show_help")}),
        (
            "اعلان ها",
            {
                "fields": (
                    "notify_vehicle_entry",
                    "notify_vehicle_exit",
                    "notify_capacity_full",
                    "notify_daily_revenue",
                    "notification_email",
                )
            },
        ),
    )

    def has_add_permission(self, request):
        return not ParkingSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


def register_model(model, admin_class):
    if admin.site.is_registered(model):
        admin.site.unregister(model)
    admin.site.register(model, admin_class)


register_model(Tariff, TariffAdmin)
register_model(ParkingSpot, ParkingSpotAdmin)
register_model(VehicleTraffic, VehicleTrafficAdmin)
register_model(OperatorShift, OperatorShiftAdmin)
register_model(UserProfile, UserProfileAdmin)
register_model(ParkingSettings, ParkingSettingsAdmin)

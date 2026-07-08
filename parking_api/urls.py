from django.urls import path

from .auth_views import ChangePasswordAPI, LoginAPI, LogoutAPI, MeAPI, RefreshAPI
from .views import (
    TariffListAPI, 
    VehicleEntryAPI, 
    ActiveVehiclesAPI, 
    VehicleExitAPI, 
    DashboardStatsAPI,
    DashboardChartsAPI,
    ReportsAPI,
    ParkingSpotsListAPI,
    ShiftListAPI,
    StartShiftAPI,
    EndShiftAPI,
    UserManagementAPI,
    UserDetailAPI,
    UserResetPasswordAPI,
    SettingsAPI,
)

urlpatterns = [
    path('auth/login/', LoginAPI.as_view(), name='auth-login'),
    path('auth/refresh/', RefreshAPI.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutAPI.as_view(), name='auth-logout'),
    path('auth/change-password/', ChangePasswordAPI.as_view(), name='auth-change-password'),
    path('auth/me/', MeAPI.as_view(), name='auth-me'),
    path('users/', UserManagementAPI.as_view(), name='user-management'),
    path('users/<int:pk>/reset-password/', UserResetPasswordAPI.as_view(), name='user-reset-password'),
    path('users/<int:pk>/', UserDetailAPI.as_view(), name='user-detail'),
    path('settings/', SettingsAPI.as_view(), name='settings'),
    path('shifts/', ShiftListAPI.as_view(), name='shift-list'),
    path('shifts/start/', StartShiftAPI.as_view(), name='start-shift'),
    path('shifts/end/', EndShiftAPI.as_view(), name='end-shift'),
    path('parking-spots/', ParkingSpotsListAPI.as_view(), name='parking-spots'),
    path('tariffs/', TariffListAPI.as_view(), name='tariff-list'),
    path('vehicle-entry/', VehicleEntryAPI.as_view(), name='vehicle-entry'),
    path('active-vehicles/', ActiveVehiclesAPI.as_view(), name='active-vehicles'),
    path('vehicle-exit/', VehicleExitAPI.as_view(), name='vehicle-exit'),
    path('dashboard-stats/', DashboardStatsAPI.as_view(), name='dashboard-stats'),
    path('dashboard-charts/', DashboardChartsAPI.as_view(), name='dashboard-charts'),
    path('reports/', ReportsAPI.as_view(), name='reports'),
]

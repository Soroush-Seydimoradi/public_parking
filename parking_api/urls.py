from django.urls import path

from .auth_views import LoginAPI, LogoutAPI, MeAPI, RefreshAPI
from .views import (
    TariffListAPI, 
    VehicleEntryAPI, 
    ActiveVehiclesAPI, 
    VehicleExitAPI, 
    DashboardStatsAPI,
    ParkingSpotsListAPI,
    ShiftListAPI,
    StartShiftAPI,
    EndShiftAPI,
    UserManagementAPI,
    UserDeleteAPI
)

urlpatterns = [
    path('auth/login/', LoginAPI.as_view(), name='auth-login'),
    path('auth/refresh/', RefreshAPI.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutAPI.as_view(), name='auth-logout'),
    path('auth/me/', MeAPI.as_view(), name='auth-me'),
    path('users/', UserManagementAPI.as_view(), name='user-management'),
    path('users/<int:pk>/', UserDeleteAPI.as_view(), name='user-delete'),
    path('shifts/', ShiftListAPI.as_view(), name='shift-list'),
    path('shifts/start/', StartShiftAPI.as_view(), name='start-shift'),
    path('shifts/end/', EndShiftAPI.as_view(), name='end-shift'),
    path('parking-spots/', ParkingSpotsListAPI.as_view(), name='parking-spots'),
    path('tariffs/', TariffListAPI.as_view(), name='tariff-list'),
    path('vehicle-entry/', VehicleEntryAPI.as_view(), name='vehicle-entry'),
    path('active-vehicles/', ActiveVehiclesAPI.as_view(), name='active-vehicles'),
    path('vehicle-exit/', VehicleExitAPI.as_view(), name='vehicle-exit'),
    path('dashboard-stats/', DashboardStatsAPI.as_view(), name='dashboard-stats'),
]
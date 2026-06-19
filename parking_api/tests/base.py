from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from parking_api.models import ParkingSpot, Tariff, UserProfile


class ParkingAPITestCase(APITestCase):
    """Shared helpers for parking API integration tests."""

    def create_user_with_profile(
        self,
        *,
        username: str,
        password: str,
        name: str,
        role: str = "اپراتور",
        is_active: bool = True,
    ) -> User:
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=name,
            is_active=is_active,
        )
        UserProfile.objects.create(user=user, phone=username, role=role)
        return user

    def create_manager(self, username: str = "09120000000", password: str = "ManagerPass123!") -> User:
        return self.create_user_with_profile(
            username=username,
            password=password,
            name="مدیر سیستم",
            role="مدیر",
        )

    def create_operator(self, username: str = "09121111111", password: str = "OperatorPass123!") -> User:
        return self.create_user_with_profile(
            username=username,
            password=password,
            name="اپراتور سیستم",
            role="اپراتور",
        )

    def authenticate(self, user: User) -> None:
        self.client.force_authenticate(user=user)

    def create_tariff(
        self,
        name: str = "سواری",
        base_rate: int = 50000,
        hourly_rate: int = 30000,
    ) -> Tariff:
        return Tariff.objects.create(
            name=name,
            base_rate=base_rate,
            hourly_rate=hourly_rate,
        )

    def prepare_spot(self, spot_number: str) -> ParkingSpot:
        ParkingSpot.objects.filter(spot_number=spot_number).update(status="available")
        return ParkingSpot.objects.get(spot_number=spot_number)

    def entry_payload(self, plate: str, tariff_id: int, spot_id: int) -> dict:
        return {
            "plate_number": plate,
            "tariff": tariff_id,
            "parking_spot": spot_id,
        }

    def register_entry(self, plate: str, tariff: Tariff, spot: ParkingSpot):
        if not hasattr(self, "user"):
            self.user = self.create_operator()
            self.authenticate(self.user)

        response = self.client.post(
            "/api/vehicle-entry/",
            self.entry_payload(plate, tariff.id, spot.id),
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response

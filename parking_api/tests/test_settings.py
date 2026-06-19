from rest_framework import status

from parking_api.models import ParkingSettings, Tariff, VehicleTraffic

from parking_api.tests.base import ParkingAPITestCase


class SettingsPersistenceTests(ParkingAPITestCase):
    def setUp(self):
        self.manager = self.create_manager(username="09120000001")
        self.operator = self.create_operator(username="09120000002")
        self.settings = ParkingSettings.get_instance()
        self.url = "/api/settings/"

    def test_get_settings_returns_persisted_values(self):
        self.settings.parking_name = "پارکینگ مرکزی"
        self.settings.save(update_fields=["parking_name"])

        self.authenticate(self.operator)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["parking_name"], "پارکینگ مرکزی")

    def test_manager_can_update_general_settings(self):
        self.authenticate(self.manager)
        response = self.client.put(
            self.url,
            {"parking_name": "پارکینگ ولیعصر", "total_capacity": 48},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["parking_name"], "پارکینگ ولیعصر")
        self.assertEqual(response.data["total_capacity"], 48)

    def test_operator_cannot_update_settings(self):
        self.authenticate(self.operator)
        response = self.client.put(self.url, {"parking_name": "نام غیرمجاز"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_updated_capacity_is_used_by_dashboard(self):
        self.authenticate(self.manager)
        self.client.put(self.url, {"total_capacity": 33}, format="json")

        response = self.client.get("/api/dashboard-stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_spots"], 33)

from rest_framework import status

from parking_api.models import ParkingSettings, VehicleTraffic

from parking_api.tests.base import ParkingAPITestCase


class ParkingSpotsTests(ParkingAPITestCase):
    def setUp(self):
        self.user = self.create_operator()
        self.authenticate(self.user)
        self.tariff = self.create_tariff()
        self.spot = self.prepare_spot("A-1")
        self.settings = ParkingSettings.get_instance()
        self.url = "/api/parking-spots/"

    def test_list_returns_capacity_and_spots(self):
        self.settings.total_capacity = 42
        self.settings.save(update_fields=["total_capacity"])

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_capacity"], 42)
        self.assertIn("spots", response.data)
        self.assertGreater(len(response.data["spots"]), 0)
        self.assertEqual(response.data["spots"][0]["spot_number"], "A-1")

    def test_occupied_spot_includes_license_plate(self):
        VehicleTraffic.objects.create(
            plate_number="12 الف 777 ایران 77",
            tariff=self.tariff,
            parking_spot=self.spot,
            is_inside=True,
        )
        self.spot.status = "occupied"
        self.spot.save(update_fields=["status"])

        response = self.client.get(self.url)
        occupied = next(item for item in response.data["spots"] if item["id"] == self.spot.id)

        self.assertEqual(occupied["status"], "occupied")
        self.assertEqual(occupied["license_plate"], "12 الف 777 ایران 77")

    def test_available_spot_has_no_license_plate(self):
        response = self.client.get(self.url)
        available = next(item for item in response.data["spots"] if item["id"] == self.spot.id)

        self.assertEqual(available["status"], "available")
        self.assertNotIn("license_plate", available)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

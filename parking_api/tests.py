from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from parking_api.capacity import get_parking_capacity
from parking_api.models import ParkingSettings, ParkingSpot, Tariff, VehicleTraffic
from parking_api.views import VehicleEntryAPI


class VehicleEntryDuplicatePlateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="09121111111", password="test-pass")
        self.client.force_authenticate(user=self.user)
        self.tariff = Tariff.objects.create(
            name="سواری",
            base_rate=50000,
            hourly_rate=30000,
        )
        ParkingSpot.objects.filter(spot_number__in=["A-1", "A-2"]).update(status="available")
        self.spot_one = ParkingSpot.objects.get(spot_number="A-1")
        self.spot_two = ParkingSpot.objects.get(spot_number="A-2")
        self.url = "/api/vehicle-entry/"
        self.plate = "12 الف 345 ایران 67"

    def _entry_payload(self, plate, spot_id):
        return {
            "plate_number": plate,
            "tariff": self.tariff.id,
            "parking_spot": spot_id,
        }

    def test_first_entry_succeeds(self):
        response = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_one.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["plate_number"], self.plate)
        self.assertTrue(response.data["is_inside"])
        self.assertEqual(VehicleTraffic.objects.filter(is_inside=True).count(), 1)

    def test_duplicate_active_plate_rejected(self):
        first = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_one.id),
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_two.id),
            format="json",
        )

        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            duplicate.data,
            {"error": VehicleEntryAPI.DUPLICATE_ACTIVE_PLATE_ERROR},
        )
        self.assertEqual(VehicleTraffic.objects.filter(is_inside=True).count(), 1)

        self.spot_two.refresh_from_db()
        self.assertEqual(self.spot_two.status, "available")

    def test_same_plate_allowed_after_exit(self):
        entry = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_one.id),
            format="json",
        )
        self.assertEqual(entry.status_code, status.HTTP_201_CREATED)

        exit_response = self.client.post(
            "/api/vehicle-exit/",
            {"traffic_id": entry.data["id"]},
            format="json",
        )
        self.assertEqual(exit_response.status_code, status.HTTP_200_OK)

        reentry = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_two.id),
            format="json",
        )

        self.assertEqual(reentry.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VehicleTraffic.objects.filter(is_inside=True).count(), 1)

    def test_different_plates_can_be_active_simultaneously(self):
        first = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_one.id),
            format="json",
        )
        second = self.client.post(
            self.url,
            self._entry_payload("98 ب 765 ایران 21", self.spot_two.id),
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(VehicleTraffic.objects.filter(is_inside=True).count(), 2)

    def test_duplicate_detected_when_plate_has_surrounding_whitespace(self):
        first = self.client.post(
            self.url,
            self._entry_payload(self.plate, self.spot_one.id),
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(
            self.url,
            self._entry_payload(f"  {self.plate}  ", self.spot_two.id),
            format="json",
        )

        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            duplicate.data,
            {"error": VehicleEntryAPI.DUPLICATE_ACTIVE_PLATE_ERROR},
        )


class ParkingCapacityTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="09122222222", password="test-pass")
        self.client.force_authenticate(user=self.user)
        self.tariff = Tariff.objects.create(
            name="وانت",
            base_rate=60000,
            hourly_rate=35000,
        )
        ParkingSpot.objects.filter(spot_number__in=["A-1", "A-2"]).update(status="available")
        self.spot_one = ParkingSpot.objects.get(spot_number="A-1")
        self.spot_two = ParkingSpot.objects.get(spot_number="A-2")
        self.settings = ParkingSettings.objects.get(pk=1)
        self.entry_url = "/api/vehicle-entry/"

    def _entry_payload(self, plate, spot_id):
        return {
            "plate_number": plate,
            "tariff": self.tariff.id,
            "parking_spot": spot_id,
        }

    def test_migration_seeds_capacity_from_parking_spots(self):
        self.assertEqual(
            self.settings.total_capacity,
            ParkingSpot.objects.exclude(status="disabled").count(),
        )

    def test_dashboard_stats_use_database_capacity(self):
        self.settings.total_capacity = 42
        self.settings.save()

        response = self.client.get("/api/dashboard-stats/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_spots"], 42)

    def test_parking_spots_api_includes_total_capacity(self):
        self.settings.total_capacity = 42
        self.settings.save()

        response = self.client.get("/api/parking-spots/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_capacity"], 42)
        self.assertIn("spots", response.data)
        self.assertGreater(len(response.data["spots"]), 0)

    def test_entry_rejected_when_capacity_is_full(self):
        self.settings.total_capacity = 1
        self.settings.save()

        first = self.client.post(
            self.entry_url,
            self._entry_payload("12 الف 111 ایران 11", self.spot_one.id),
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(
            self.entry_url,
            self._entry_payload("98 ب 222 ایران 22", self.spot_two.id),
            format="json",
        )

        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            second.data,
            {"error": VehicleEntryAPI.PARKING_AT_CAPACITY_ERROR},
        )
        self.assertEqual(VehicleTraffic.objects.filter(is_inside=True).count(), 1)

    def test_get_parking_capacity_reads_singleton_settings(self):
        self.settings.total_capacity = 37
        self.settings.save()

        self.assertEqual(get_parking_capacity(), 37)

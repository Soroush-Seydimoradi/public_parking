from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from parking_api.models import ParkingSpot, Tariff, VehicleTraffic
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

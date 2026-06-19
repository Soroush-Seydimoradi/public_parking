from rest_framework import status

from parking_api.models import ParkingSettings, ParkingSpot, VehicleTraffic
from parking_api.views import VehicleEntryAPI

from parking_api.tests.base import ParkingAPITestCase


class VehicleEntryTests(ParkingAPITestCase):
    def setUp(self):
        self.user = self.create_operator()
        self.authenticate(self.user)
        self.tariff = self.create_tariff()
        self.spot_one = self.prepare_spot("A-1")
        self.spot_two = self.prepare_spot("A-2")
        self.url = "/api/vehicle-entry/"
        self.plate = "12 الف 345 ایران 67"
        self.settings = ParkingSettings.get_instance()

    def test_entry_succeeds_and_assigns_spot(self):
        response = self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_one.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["plate_number"], self.plate)
        self.assertTrue(response.data["is_inside"])
        self.assertEqual(response.data["parking_spot"], self.spot_one.id)

        self.spot_one.refresh_from_db()
        self.assertEqual(self.spot_one.status, "occupied")

    def test_duplicate_active_plate_is_rejected(self):
        self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_one.id),
            format="json",
        )

        response = self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_two.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"error": VehicleEntryAPI.DUPLICATE_ACTIVE_PLATE_ERROR})
        self.assertEqual(VehicleTraffic.objects.filter(is_inside=True).count(), 1)

    def test_entry_rejected_when_parking_is_at_capacity(self):
        self.settings.total_capacity = 1
        self.settings.save(update_fields=["total_capacity"])

        self.client.post(
            self.url,
            self.entry_payload("12 الف 111 ایران 11", self.tariff.id, self.spot_one.id),
            format="json",
        )

        response = self.client.post(
            self.url,
            self.entry_payload("98 ب 222 ایران 22", self.tariff.id, self.spot_two.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"error": VehicleEntryAPI.PARKING_AT_CAPACITY_ERROR})

    def test_entry_requires_parking_spot(self):
        response = self.client.post(
            self.url,
            {"plate_number": self.plate, "tariff": self.tariff.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"error": "انتخاب جایگاه پارکینگ الزامی است."})

    def test_entry_rejects_unavailable_spot(self):
        self.spot_one.status = "occupied"
        self.spot_one.save(update_fields=["status"])

        response = self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_one.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"error": "این جایگاه در حال حاضر قابل اختصاص نیست."})

    def test_plate_whitespace_is_normalized(self):
        self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_one.id),
            format="json",
        )

        response = self.client.post(
            self.url,
            self.entry_payload(f"  {self.plate}  ", self.tariff.id, self.spot_two.id),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"error": VehicleEntryAPI.DUPLICATE_ACTIVE_PLATE_ERROR})

    def test_same_plate_allowed_after_exit(self):
        entry = self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_one.id),
            format="json",
        )

        self.client.post(
            "/api/vehicle-exit/",
            {"traffic_id": entry.data["id"]},
            format="json",
        )

        reentry = self.client.post(
            self.url,
            self.entry_payload(self.plate, self.tariff.id, self.spot_two.id),
            format="json",
        )

        self.assertEqual(reentry.status_code, status.HTTP_201_CREATED)

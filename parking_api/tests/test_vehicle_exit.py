from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status

from parking_api.models import VehicleTraffic

from parking_api.tests.base import ParkingAPITestCase


class VehicleExitTests(ParkingAPITestCase):
    def setUp(self):
        self.user = self.create_operator()
        self.authenticate(self.user)
        self.tariff = self.create_tariff(base_rate=50000, hourly_rate=30000)
        self.spot = self.prepare_spot("A-1")
        self.exit_url = "/api/vehicle-exit/"

    def _create_inside_vehicle(self, plate: str, entry_time=None):
        traffic = VehicleTraffic.objects.create(
            plate_number=plate,
            tariff=self.tariff,
            parking_spot=self.spot,
            is_inside=True,
        )
        self.spot.status = "occupied"
        self.spot.save(update_fields=["status"])

        if entry_time is not None:
            VehicleTraffic.objects.filter(pk=traffic.pk).update(entry_time=entry_time)
            traffic.refresh_from_db()
        return traffic

    def test_exit_charges_base_rate_for_first_hour(self):
        traffic = self._create_inside_vehicle("12 الف 111 ایران 11")

        response = self.client.post(
            self.exit_url,
            {"traffic_id": traffic.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_inside"])
        self.assertEqual(Decimal(str(response.data["total_cost"])), Decimal("50000"))

        self.spot.refresh_from_db()
        self.assertEqual(self.spot.status, "available")

    def test_exit_charges_additional_hours(self):
        entry_time = timezone.now() - timedelta(hours=1, minutes=30)
        traffic = self._create_inside_vehicle("98 ب 222 ایران 22", entry_time=entry_time)

        response = self.client.post(
            self.exit_url,
            {"traffic_id": traffic.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data["total_cost"])), Decimal("80000"))

    def test_exit_not_found_for_invalid_or_already_exited_vehicle(self):
        traffic = self._create_inside_vehicle("45 ج 333 ایران 33")
        self.client.post(self.exit_url, {"traffic_id": traffic.id}, format="json")

        response = self.client.post(
            self.exit_url,
            {"traffic_id": traffic.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {"error": "خودرو یافت نشد یا قبلاً خارج شده است"})

    def test_active_vehicles_lists_only_inside_vehicles(self):
        inside = self._create_inside_vehicle("12 الف 444 ایران 44")
        exited = self._create_inside_vehicle("98 ب 555 ایران 55")
        self.client.post(self.exit_url, {"traffic_id": exited.id}, format="json")

        response = self.client.get("/api/active-vehicles/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], inside.id)

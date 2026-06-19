from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from parking_api.capacity import get_parking_capacity
from parking_api.models import OperatorShift, ParkingSettings, ParkingSpot, Tariff, VehicleTraffic
from parking_api.shift_services import get_shift_statistics
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


class ShiftStatisticsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="09123333333", password="test-pass")
        self.client.force_authenticate(user=self.user)
        self.tariff = Tariff.objects.create(
            name="سواری",
            base_rate=50000,
            hourly_rate=30000,
        )
        ParkingSpot.objects.filter(spot_number__in=["A-1", "A-2", "A-3"]).update(status="available")
        self.spot_one = ParkingSpot.objects.get(spot_number="A-1")
        self.spot_two = ParkingSpot.objects.get(spot_number="A-2")
        self.spot_three = ParkingSpot.objects.get(spot_number="A-3")
        self.shift_start = timezone.now() - timedelta(hours=2)
        self.shift = OperatorShift.objects.create(status="active")
        OperatorShift.objects.filter(pk=self.shift.pk).update(start_time=self.shift_start)
        self.shift.refresh_from_db()

    def _create_traffic(self, plate, spot, entry_time, exit_time=None, total_cost=0):
        traffic = VehicleTraffic.objects.create(
            plate_number=plate,
            tariff=self.tariff,
            parking_spot=spot,
            is_inside=exit_time is None,
            total_cost=total_cost,
        )
        VehicleTraffic.objects.filter(pk=traffic.pk).update(
            entry_time=entry_time,
            exit_time=exit_time,
        )
        traffic.refresh_from_db()
        return traffic

    def test_empty_shift_statistics_are_zero(self):
        end_time = timezone.now()

        stats = get_shift_statistics(self.shift_start, end_time)

        self.assertEqual(stats["revenue"], 0)
        self.assertEqual(stats["vehicles_entered"], 0)
        self.assertEqual(stats["vehicles_exited"], 0)

    def test_shift_statistics_count_entries_exits_and_revenue(self):
        entry_one = self.shift_start + timedelta(minutes=10)
        entry_two = self.shift_start + timedelta(minutes=20)
        exit_one = self.shift_start + timedelta(minutes=40)
        exit_two = self.shift_start + timedelta(minutes=50)
        end_time = self.shift_start + timedelta(hours=1)

        self._create_traffic("12 الف 111 ایران 11", self.spot_one, entry_one, exit_one, 50000)
        self._create_traffic("98 ب 222 ایران 22", self.spot_two, entry_two, exit_two, 80000)
        self._create_traffic("45 ج 333 ایران 33", self.spot_three, entry_two)

        stats = get_shift_statistics(self.shift_start, end_time)

        self.assertEqual(stats["vehicles_entered"], 3)
        self.assertEqual(stats["vehicles_exited"], 2)
        self.assertEqual(stats["revenue"], Decimal("130000"))

    def test_traffic_outside_shift_window_is_excluded(self):
        before_shift = self.shift_start - timedelta(hours=1)
        after_shift = self.shift_start + timedelta(hours=3)
        end_time = self.shift_start + timedelta(hours=1)

        self._create_traffic(
            "12 الف 444 ایران 44",
            self.spot_one,
            before_shift,
            self.shift_start - timedelta(minutes=30),
            90000,
        )
        self._create_traffic(
            "98 ب 555 ایران 55",
            self.spot_two,
            after_shift,
            after_shift + timedelta(minutes=30),
            70000,
        )

        stats = get_shift_statistics(self.shift_start, end_time)

        self.assertEqual(stats["vehicles_entered"], 0)
        self.assertEqual(stats["vehicles_exited"], 0)
        self.assertEqual(stats["revenue"], 0)

    def test_end_shift_api_returns_calculated_statistics(self):
        entry_time = self.shift_start + timedelta(minutes=15)
        exit_time = self.shift_start + timedelta(minutes=45)

        self._create_traffic("12 الف 666 ایران 66", self.spot_one, entry_time, exit_time, 50000)
        self._create_traffic("98 ب 777 ایران 77", self.spot_two, entry_time)

        response = self.client.post("/api/shifts/end/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertIsNotNone(response.data["end_time"])
        self.assertEqual(int(response.data["vehicles_entered"]), 2)
        self.assertEqual(int(response.data["vehicles_exited"]), 1)
        self.assertEqual(Decimal(str(response.data["revenue"])), Decimal("50000"))
        self.assertIn("operator_name", response.data)

        self.shift.refresh_from_db()
        self.assertEqual(self.shift.status, "completed")
        self.assertEqual(self.shift.vehicles_entered, 2)
        self.assertEqual(self.shift.vehicles_exited, 1)
        self.assertEqual(self.shift.revenue, Decimal("50000"))

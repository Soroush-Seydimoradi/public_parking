from datetime import datetime, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status

from parking_api.models import VehicleTraffic

from parking_api.tests.base import ParkingAPITestCase


class ReportsTests(ParkingAPITestCase):
    def setUp(self):
        self.user = self.create_operator()
        self.authenticate(self.user)
        self.tariff_car = self.create_tariff(name="سواری", base_rate=50000, hourly_rate=30000)
        self.tariff_truck = self.create_tariff(name="وانت", base_rate=70000, hourly_rate=40000)
        self.url = "/api/reports/"

    def _create_exit(self, plate, tariff, exit_time, total_cost):
        entry_time = exit_time - timedelta(hours=1)
        traffic = VehicleTraffic.objects.create(
            plate_number=plate,
            tariff=tariff,
            is_inside=False,
            total_cost=total_cost,
        )
        VehicleTraffic.objects.filter(pk=traffic.pk).update(
            entry_time=entry_time,
            exit_time=exit_time,
        )

    def test_week_report_returns_expected_sections(self):
        response = self.client.get(self.url, {"range": "week"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("filters", response.data)
        self.assertIn("revenue", response.data)
        self.assertIn("traffic", response.data)
        self.assertIn("occupancy", response.data)
        self.assertEqual(response.data["filters"]["range"], "week")
        self.assertIn("trend", response.data["revenue"])
        self.assertIn("summary", response.data["revenue"])
        self.assertIn("hourly_rates", response.data["occupancy"])

    def test_report_includes_revenue_from_exits_in_range(self):
        today = timezone.localdate()
        exit_time = timezone.make_aware(datetime.combine(today, datetime.min.time()).replace(hour=12))
        self._create_exit("12 الف 111 ایران 11", self.tariff_car, exit_time, 50000)
        self._create_exit("98 ب 222 ایران 22", self.tariff_car, exit_time, 80000)

        response = self.client.get(self.url, {"range": "today"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["revenue"]["summary"]["total_revenue"], 130000)

    def test_report_filters_by_vehicle_type(self):
        today = timezone.localdate()
        exit_time = timezone.make_aware(datetime.combine(today, datetime.min.time()).replace(hour=10))
        self._create_exit("12 الف 333 ایران 33", self.tariff_car, exit_time, 50000)
        self._create_exit("98 ب 444 ایران 44", self.tariff_truck, exit_time, 70000)

        response = self.client.get(
            self.url,
            {"range": "today", "vehicle_type": "وانت"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["vehicle_type"], "وانت")
        self.assertEqual(response.data["revenue"]["summary"]["total_revenue"], 70000)
        self.assertEqual(len(response.data["traffic"]["vehicle_types"]), 1)
        self.assertEqual(response.data["traffic"]["vehicle_types"][0]["name"], "وانت")

    def test_custom_range_requires_dates(self):
        response = self.client.get(self.url, {"range": "custom"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_custom_range_rejects_invalid_date_order(self):
        response = self.client.get(
            self.url,
            {
                "range": "custom",
                "start_date": "2026-06-20",
                "end_date": "2026-06-10",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_custom_range_accepts_valid_dates(self):
        today = timezone.localdate().isoformat()
        response = self.client.get(
            self.url,
            {
                "range": "custom",
                "start_date": today,
                "end_date": today,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["filters"]["range"], "custom")
        self.assertEqual(response.data["filters"]["start_date"], today)
        self.assertEqual(response.data["filters"]["end_date"], today)

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from parking_api.models import OperatorShift, VehicleTraffic
from parking_api.shift_services import get_shift_statistics

from parking_api.tests.base import ParkingAPITestCase


class ShiftStatisticsTests(ParkingAPITestCase):
    def setUp(self):
        self.user = self.create_operator(username="09123333333")
        self.authenticate(self.user)
        self.tariff = self.create_tariff()
        self.spot_one = self.prepare_spot("A-1")
        self.spot_two = self.prepare_spot("A-2")
        self.spot_three = self.prepare_spot("A-3")
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
        return traffic

    def test_empty_shift_statistics_are_zero(self):
        stats = get_shift_statistics(self.shift_start, timezone.now())
        self.assertEqual(stats["revenue"], 0)
        self.assertEqual(stats["vehicles_entered"], 0)
        self.assertEqual(stats["vehicles_exited"], 0)

    def test_end_shift_api_returns_calculated_statistics(self):
        entry_time = self.shift_start + timedelta(minutes=15)
        exit_time = self.shift_start + timedelta(minutes=45)

        self._create_traffic("12 الف 666 ایران 66", self.spot_one, entry_time, exit_time, 50000)
        self._create_traffic("98 ب 777 ایران 77", self.spot_two, entry_time)

        response = self.client.post("/api/shifts/end/", format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "completed")
        self.assertEqual(int(response.data["vehicles_entered"]), 2)
        self.assertEqual(int(response.data["vehicles_exited"]), 1)
        self.assertEqual(Decimal(str(response.data["revenue"])), Decimal("50000"))

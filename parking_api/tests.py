from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from parking_api.capacity import get_parking_capacity
from parking_api.models import OperatorShift, ParkingSettings, ParkingSpot, Tariff, UserProfile, VehicleTraffic
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


class UserManagementTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username="09120000000",
            password="ManagerPass123!",
            first_name="مدیر سیستم",
            is_active=True,
        )
        UserProfile.objects.create(user=self.manager, phone="09120000000", role="مدیر")
        self.client.force_authenticate(user=self.manager)
        self.users_url = "/api/users/"

    def _create_user(self, phone, name, role="اپراتور", is_active=True):
        user = User.objects.create_user(
            username=phone,
            password="UserPass123!",
            first_name=name,
            is_active=is_active,
        )
        UserProfile.objects.create(user=user, phone=phone, role=role)
        return user

    def test_create_user_validates_phone_and_role(self):
        invalid_phone = self.client.post(
            self.users_url,
            {"name": "کاربر تست", "phone": "123", "role": "اپراتور", "is_active": True},
            format="json",
        )
        self.assertEqual(invalid_phone.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", invalid_phone.data)

        invalid_role = self.client.post(
            self.users_url,
            {"name": "کاربر تست", "phone": "09121112222", "role": "نقش نامعتبر", "is_active": True},
            format="json",
        )
        self.assertEqual(invalid_role.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", invalid_role.data)

    def test_create_user_success_preserves_response_format(self):
        response = self.client.post(
            self.users_url,
            {"name": "علی احمدی", "phone": "09123334444", "role": "اپراتور", "is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data, {"success": "کاربر با موفقیت ایجاد شد"})
        created = User.objects.get(username="09123334444")
        self.assertTrue(created.check_password("TemporaryPassword123!") is False)

    def test_update_user_name_role_and_active_status(self):
        user = self._create_user("09124445555", "کاربر اول", role="کاربر")

        response = self.client.put(
            f"{self.users_url}{user.id}/",
            {"name": "کاربر ویرایش‌شده", "role": "اپراتور", "is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "کاربر ویرایش‌شده")
        self.assertEqual(response.data["role"], "اپراتور")
        self.assertFalse(response.data["is_active"])

        user.refresh_from_db()
        self.assertEqual(user.first_name, "کاربر ویرایش‌شده")
        self.assertFalse(user.is_active)
        self.assertEqual(user.profile.role, "اپراتور")

    def test_update_user_phone_changes_username(self):
        user = self._create_user("09125556666", "کاربر دوم")

        response = self.client.put(
            f"{self.users_url}{user.id}/",
            {"phone": "09126667777"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.username, "09126667777")
        self.assertEqual(user.profile.phone, "09126667777")

    def test_cannot_delete_or_deactivate_self(self):
        delete_response = self.client.delete(f"{self.users_url}{self.manager.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete_response.data["error"], "امکان حذف حساب کاربری خود وجود ندارد.")

        deactivate_response = self.client.put(
            f"{self.users_url}{self.manager.id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(deactivate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(deactivate_response.data["error"], "امکان غیرفعال‌سازی حساب کاربری خود وجود ندارد.")

    def test_cannot_remove_last_manager(self):
        response = self.client.put(
            f"{self.users_url}{self.manager.id}/",
            {"role": "اپراتور"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "امکان حذف یا غیرفعال‌سازی آخرین مدیر سیستم وجود ندارد.",
        )

    def test_reset_password_returns_temporary_password(self):
        user = self._create_user("09127778888", "کاربر سوم")

        response = self.client.post(f"{self.users_url}{user.id}/reset-password/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["success"], "رمز عبور کاربر با موفقیت بازنشانی شد.")
        self.assertIn("temporary_password", response.data)
        user.refresh_from_db()
        self.assertTrue(user.check_password(response.data["temporary_password"]))

    def test_change_password_requires_current_password(self):
        self.client.force_authenticate(user=self._create_user("09128889999", "کاربر چهارم"))

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "WrongPass123!",
                "new_password": "NewSecure123!",
                "confirm_password": "NewSecure123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.data)

    def test_change_password_success(self):
        user = self._create_user("09129990000", "کاربر پنجم")
        self.client.force_authenticate(user=user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "UserPass123!",
                "new_password": "BrandNew123!",
                "confirm_password": "BrandNew123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["success"], "رمز عبور با موفقیت تغییر کرد.")
        user.refresh_from_db()
        self.assertTrue(user.check_password("BrandNew123!"))


class SettingsPersistenceTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username="09120000001",
            password="ManagerPass123!",
            first_name="مدیر",
        )
        UserProfile.objects.create(user=self.manager, phone="09120000001", role="مدیر")
        self.operator = User.objects.create_user(
            username="09120000002",
            password="OperatorPass123!",
            first_name="اپراتور",
        )
        UserProfile.objects.create(user=self.operator, phone="09120000002", role="اپراتور")
        self.settings = ParkingSettings.get_instance()
        self.settings_url = "/api/settings/"

    def test_get_settings_returns_persisted_values(self):
        self.settings.parking_name = "پارکینگ مرکزی"
        self.settings.address = "اصفهان، خیابان چهارباغ"
        self.settings.contact_phone = "031-12345678"
        self.settings.total_capacity = 45
        self.settings.notify_daily_revenue = True
        self.settings.notification_email = "reports@example.com"
        self.settings.save()

        self.client.force_authenticate(user=self.operator)
        response = self.client.get(self.settings_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["parking_name"], "پارکینگ مرکزی")
        self.assertEqual(response.data["address"], "اصفهان، خیابان چهارباغ")
        self.assertEqual(response.data["phone"], "031-12345678")
        self.assertEqual(response.data["total_capacity"], 45)
        self.assertTrue(response.data["notify_daily_revenue"])
        self.assertEqual(response.data["notification_email"], "reports@example.com")

    def test_manager_can_update_general_settings(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.put(
            self.settings_url,
            {
                "parking_name": "پارکینگ ولیعصر",
                "address": "تهران، ولیعصر",
                "phone": "021-99887766",
                "total_capacity": 48,
                "auto_dark_mode": False,
                "show_help": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["parking_name"], "پارکینگ ولیعصر")
        self.assertEqual(response.data["total_capacity"], 48)
        self.assertFalse(response.data["auto_dark_mode"])

        self.settings.refresh_from_db()
        self.assertEqual(self.settings.parking_name, "پارکینگ ولیعصر")
        self.assertEqual(self.settings.total_capacity, 48)

    def test_manager_can_update_notification_settings(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.put(
            self.settings_url,
            {
                "notify_vehicle_entry": False,
                "notify_vehicle_exit": False,
                "notify_capacity_full": True,
                "notify_daily_revenue": True,
                "notification_email": "alerts@parking.ir",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["notify_vehicle_entry"])
        self.assertTrue(response.data["notify_daily_revenue"])
        self.assertEqual(response.data["notification_email"], "alerts@parking.ir")

    def test_operator_cannot_update_settings(self):
        self.client.force_authenticate(user=self.operator)
        response = self.client.put(
            self.settings_url,
            {"parking_name": "نام غیرمجاز"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_capacity_cannot_be_lower_than_vehicles_inside(self):
        tariff = Tariff.objects.create(name="سواری", base_rate=50000, hourly_rate=30000)
        spot = ParkingSpot.objects.get(spot_number="A-1")
        VehicleTraffic.objects.create(
            plate_number="12 الف 999 ایران 99",
            tariff=tariff,
            parking_spot=spot,
            is_inside=True,
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.put(
            self.settings_url,
            {"total_capacity": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("total_capacity", response.data)

    def test_updated_capacity_is_used_by_dashboard(self):
        self.client.force_authenticate(user=self.manager)
        self.client.put(self.settings_url, {"total_capacity": 33}, format="json")

        response = self.client.get("/api/dashboard-stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_spots"], 33)

from django.contrib.auth.models import User
from rest_framework import status

from parking_api.models import UserProfile

from parking_api.tests.base import ParkingAPITestCase


class UserManagementTests(ParkingAPITestCase):
    def setUp(self):
        self.manager = self.create_manager()
        self.authenticate(self.manager)
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

    def test_list_users_requires_manager(self):
        operator = self.create_operator(username="09123000001")
        self.authenticate(operator)

        response = self.client.get(self.users_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_list_users(self):
        self._create_user("09124000001", "کاربر یک")

        response = self.client.get(self.users_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

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
        self.assertTrue(User.objects.filter(username="09123334444").exists())

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

    def test_delete_user_success(self):
        user = self._create_user("09128880000", "کاربر حذف")

        response = self.client.delete(f"{self.users_url}{user.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"success": "کاربر با موفقیت حذف شد"})
        self.assertFalse(User.objects.filter(pk=user.id).exists())

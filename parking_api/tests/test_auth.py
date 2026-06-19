from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from parking_api.tests.base import ParkingAPITestCase


class AuthenticationTests(ParkingAPITestCase):
    def setUp(self):
        self.user = self.create_operator(username="09121000001", password="ValidPass123!")
        self.login_url = "/api/auth/login/"
        self.refresh_url = "/api/auth/refresh/"
        self.logout_url = "/api/auth/logout/"
        self.me_url = "/api/auth/me/"

    def test_login_returns_tokens_and_user_payload(self):
        response = self.client.post(
            self.login_url,
            {"username": "09121000001", "password": "ValidPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "09121000001")
        self.assertEqual(response.data["user"]["role"], "اپراتور")
        self.assertEqual(response.data["user"]["phone"], "09121000001")

    def test_login_rejects_invalid_credentials(self):
        response = self.client.post(
            self.login_url,
            {"username": "09121000001", "password": "WrongPass123!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_returns_new_access_token(self):
        login = self.client.post(
            self.login_url,
            {"username": "09121000001", "password": "ValidPass123!"},
            format="json",
        )

        response = self.client.post(
            self.refresh_url,
            {"refresh": login.data["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_me_returns_authenticated_user(self):
        self.authenticate(self.user)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "09121000001")
        self.assertEqual(response.data["name"], "اپراتور سیستم")

    def test_protected_endpoint_requires_authentication(self):
        response = self.client.get("/api/active-vehicles/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        refresh = RefreshToken.for_user(self.user)
        self.authenticate(self.user)

        response = self.client.post(
            self.logout_url,
            {"refresh": str(refresh)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "logged out")

        refresh_response = self.client.post(
            self.refresh_url,
            {"refresh": str(refresh)},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_success(self):
        self.authenticate(self.user)

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "ValidPass123!",
                "new_password": "NewSecure123!",
                "confirm_password": "NewSecure123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["success"], "رمز عبور با موفقیت تغییر کرد.")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecure123!"))

    def test_change_password_rejects_wrong_current_password(self):
        self.authenticate(self.user)

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

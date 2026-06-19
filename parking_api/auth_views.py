from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .auth_serializers import CustomTokenObtainPairSerializer
from .serializers import UserListSerializer
from .user_serializers import (
    ChangePasswordSerializer,
    ResetPasswordSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    generate_temporary_password,
)
from .user_services import LastManagerError, apply_user_update


class LoginAPI(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class RefreshAPI(TokenRefreshView):
    permission_classes = [AllowAny]


class LogoutAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return Response({"detail": "logged out"}, status=status.HTTP_200_OK)


class MeAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserListSerializer(request.user).data)


class ChangePasswordAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response({"success": "رمز عبور با موفقیت تغییر کرد."})

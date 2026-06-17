from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .serializers import UserListSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserListSerializer(self.user).data
        return data

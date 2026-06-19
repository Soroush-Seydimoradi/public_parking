import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import UserProfile

VALID_ROLES = {choice[0] for choice in UserProfile.ROLE_CHOICES}
PHONE_PATTERN = re.compile(r"^09\d{9}$")


def normalize_phone(value: str) -> str:
    return value.strip()


def validate_phone_format(value: str) -> str:
    phone = normalize_phone(value)
    if not phone:
        raise serializers.ValidationError("شماره تماس الزامی است.")
    if not PHONE_PATTERN.match(phone):
        raise serializers.ValidationError("شماره تماس باید ۱۱ رقم و با ۰۹ شروع شود.")
    return phone


def validate_role_value(value: str) -> str:
    if value not in VALID_ROLES:
        raise serializers.ValidationError("نقش انتخاب‌شده معتبر نیست.")
    return value


def validate_name_value(value: str) -> str:
    name = value.strip()
    if not name:
        raise serializers.ValidationError("نام و نام خانوادگی الزامی است.")
    return name


def validate_new_password(value: str, user: User | None = None) -> str:
    try:
        validate_password(value, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc
    return value


def generate_temporary_password(length: int = 12) -> str:
    return get_random_string(
        length,
        allowed_chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%",
    )


class UserCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=15)
    role = serializers.CharField(max_length=20, default="اپراتور")
    is_active = serializers.BooleanField(default=True)

    def validate_name(self, value):
        return validate_name_value(value)

    def validate_phone(self, value):
        phone = validate_phone_format(value)
        if User.objects.filter(username=phone).exists():
            raise serializers.ValidationError("کاربری با این شماره تماس قبلاً ثبت شده است.")
        return phone

    def validate_role(self, value):
        return validate_role_value(value)


class UserUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=15, required=False)
    role = serializers.CharField(max_length=20, required=False)
    is_active = serializers.BooleanField(required=False)

    def validate_name(self, value):
        return validate_name_value(value)

    def validate_phone(self, value):
        phone = validate_phone_format(value)
        user = self.context["user"]
        if User.objects.filter(username=phone).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("کاربری با این شماره تماس قبلاً ثبت شده است.")
        return phone

    def validate_role(self, value):
        return validate_role_value(value)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("رمز عبور فعلی نادرست است.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "تکرار رمز عبور با رمز جدید یکسان نیست."}
            )
        validate_new_password(attrs["new_password"], user=self.context["request"].user)
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate_new_password(self, value):
        if not value:
            return value
        return validate_new_password(value, user=self.context.get("user"))

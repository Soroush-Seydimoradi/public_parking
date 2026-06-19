from django.contrib.auth.models import User

from .models import UserProfile


class LastManagerError(Exception):
    pass


def get_manager_count(exclude_user_id: int | None = None) -> int:
    queryset = UserProfile.objects.filter(role="مدیر", user__is_active=True)
    if exclude_user_id is not None:
        queryset = queryset.exclude(user_id=exclude_user_id)
    return queryset.count()


def user_is_active_manager(user: User) -> bool:
    profile = getattr(user, "profile", None)
    return bool(user.is_active and profile and profile.role == "مدیر")


def ensure_can_remove_manager(user: User, *, new_role: str | None = None, is_active: bool | None = None) -> None:
    if not user_is_active_manager(user):
        return

    role_changed = new_role is not None and new_role != "مدیر"
    deactivated = is_active is False
    if not role_changed and not deactivated:
        return

    if get_manager_count(exclude_user_id=user.pk) == 0:
        raise LastManagerError("امکان حذف یا غیرفعال‌سازی آخرین مدیر سیستم وجود ندارد.")


def apply_user_update(user: User, validated_data: dict) -> User:
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={"phone": user.username, "role": "اپراتور"},
    )

    new_role = validated_data.get("role", profile.role)
    new_is_active = validated_data.get("is_active", user.is_active)
    ensure_can_remove_manager(
        user,
        new_role=new_role,
        is_active=new_is_active,
    )

    if "name" in validated_data:
        user.first_name = validated_data["name"]

    if "phone" in validated_data:
        phone = validated_data["phone"]
        user.username = phone
        profile.phone = phone

    if "role" in validated_data:
        profile.role = validated_data["role"]

    if "is_active" in validated_data:
        user.is_active = validated_data["is_active"]

    user.save()
    profile.save()
    user.profile = profile
    return user

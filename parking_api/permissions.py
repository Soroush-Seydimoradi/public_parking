from rest_framework.permissions import BasePermission


class IsManager(BasePermission):
    """Allow access only to users with role 'مدیر' or Django superusers."""

    message = "فقط مدیران به این بخش دسترسی دارند."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        profile = getattr(user, "profile", None)
        return profile is not None and profile.role == "مدیر"

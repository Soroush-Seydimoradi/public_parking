from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsManager
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum
from .capacity import (
    get_available_spot_count,
    get_parking_capacity,
    get_vehicles_inside_count,
)
from .dashboard_analytics import get_dashboard_charts
from .report_analytics import get_reports, parse_iso_date
from .models import Tariff, VehicleTraffic
from .serializers import TariffSerializer, VehicleTrafficSerializer
from .shift_services import apply_shift_statistics
from .spot_services import SpotNotAvailableError, assign_spot_for_entry, release_parking_spot
import decimal
from .models import ParkingSpot
from .serializers import ParkingSpotSerializer
from .models import OperatorShift
from .serializers import OperatorShiftSerializer
from django.contrib.auth.models import User
from .models import UserProfile, ParkingSettings
from .serializers import UserListSerializer
from .user_serializers import (
    ResetPasswordSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    generate_temporary_password,
)
from .settings_serializers import ParkingSettingsUpdateSerializer
from .settings_services import apply_settings_update, settings_to_response
from .user_services import (
    LastManagerError,
    apply_user_update,
    get_manager_count,
    user_is_active_manager,
)

# ۱. دریافت لیست تعرفه‌ها و ثبت ورود (قبلاً ساختی، اینجا کامل‌تر شده)
class TariffListAPI(APIView):
    def get(self, request):
        tariffs = Tariff.objects.filter(is_active=True)
        return Response(TariffSerializer(tariffs, many=True).data)
    
    def put(self, request):
        tariff_id = request.data.get('id')
        try:
            tariff = Tariff.objects.get(id=tariff_id)
        except Tariff.DoesNotExist:
            return Response({"error": "تعرفه مورد نظر یافت نشد"}, status=status.HTTP_404_NOT_FOUND)
        
        # آپدیت فیلدها با دیتای ارسالی از فرانت
        serializer = TariffSerializer(tariff, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VehicleEntryAPI(APIView):
    DUPLICATE_ACTIVE_PLATE_ERROR = "این خودرو با این پلاک در حال حاضر داخل پارکینگ است."
    PARKING_AT_CAPACITY_ERROR = "ظرفیت پارکینگ تکمیل است."

    def post(self, request):
        parking_spot_id = request.data.get('parking_spot')
        payload = request.data.copy()
        payload.pop('parking_spot', None)

        serializer = VehicleTrafficSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not parking_spot_id:
            return Response(
                {"error": "انتخاب جایگاه پارکینگ الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plate_number = serializer.validated_data['plate_number']

        try:
            with transaction.atomic():
                if VehicleTraffic.objects.select_for_update().filter(is_inside=True).count() >= get_parking_capacity():
                    return Response(
                        {"error": self.PARKING_AT_CAPACITY_ERROR},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if VehicleTraffic.objects.select_for_update().filter(
                    plate_number=plate_number,
                    is_inside=True,
                ).exists():
                    return Response(
                        {"error": self.DUPLICATE_ACTIVE_PLATE_ERROR},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                traffic = serializer.save()
                assign_spot_for_entry(traffic, int(parking_spot_id))
        except ParkingSpot.DoesNotExist:
            return Response({"error": "جایگاه پارکینگ یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        except SpotNotAvailableError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({"error": "شناسه جایگاه پارکینگ نامعتبر است."}, status=status.HTTP_400_BAD_REQUEST)

        traffic.refresh_from_db()
        return Response(VehicleTrafficSerializer(traffic).data, status=status.HTTP_201_CREATED)

# ۲. لیست خودروهایی که همین الان داخل پارکینگ هستند
class ActiveVehiclesAPI(APIView):
    def get(self, request):
        vehicles = (
            VehicleTraffic.objects.filter(is_inside=True)
            .select_related('tariff', 'parking_spot')
            .order_by('-entry_time')
        )
        return Response(VehicleTrafficSerializer(vehicles, many=True).data)

# ۳. ثبت خروج خودرو و محاسبه هزینه
class VehicleExitAPI(APIView):
    def post(self, request):
        traffic_id = request.data.get('traffic_id')
        try:
            traffic = VehicleTraffic.objects.get(id=traffic_id, is_inside=True)
        except VehicleTraffic.DoesNotExist:
            return Response({"error": "خودرو یافت نشد یا قبلاً خارج شده است"}, status=status.HTTP_404_NOT_FOUND)

        # محاسبه زمان حضور
        traffic.exit_time = timezone.now()
        duration = traffic.exit_time - traffic.entry_time
        duration_in_hours = decimal.Decimal(duration.total_seconds() / 3600)
        
        # رند کردن ساعت به بالا (مثلاً ۱ ساعت و ۱۰ دقیقه -> ۲ ساعت)
        hours_to_charge = int(duration_in_hours)
        if duration_in_hours % 1 > 0:
            hours_to_charge += 1
        if hours_to_charge == 0:
            hours_to_charge = 1

        # فرمول محاسبه قیمت
        tariff = traffic.tariff
        if hours_to_charge == 1:
            traffic.total_cost = tariff.base_rate
        else:
            traffic.total_cost = tariff.base_rate + (decimal.Decimal(hours_to_charge - 1) * tariff.hourly_rate)

        traffic.is_inside = False
        traffic.save()
        release_parking_spot(traffic)

        return Response(VehicleTrafficSerializer(traffic).data, status=status.HTTP_200_OK)

# ۴. دریافت آمارهای زنده کل پارکینگ برای داشبورد
class DashboardStatsAPI(APIView):
    def get(self, request):
        total_spots = get_parking_capacity()
        vehicles_inside = get_vehicles_inside_count()
        available_spots = get_available_spot_count()

        # محاسبه درآمد امروز
        today = timezone.now().date()
        today_income = VehicleTraffic.objects.filter(
            exit_time__date=today,
            is_inside=False
        ).aggregate(Sum('total_cost'))['total_cost__sum'] or 0.0

        return Response({
            "total_spots": total_spots,
            "vehicles_inside": vehicles_inside,
            "available_spots": available_spots,
            "today_income": today_income
        })


class DashboardChartsAPI(APIView):
    def get(self, request):
        return Response(get_dashboard_charts())


class ReportsAPI(APIView):
    def get(self, request):
        range_type = request.query_params.get("range", "week")
        vehicle_type = request.query_params.get("vehicle_type", "all")

        try:
            start_date = parse_iso_date(request.query_params.get("start_date"))
            end_date = parse_iso_date(request.query_params.get("end_date"))
            data = get_reports(
                range_type=range_type,
                start_date=start_date,
                end_date=end_date,
                vehicle_type=vehicle_type,
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(data)
    
class ParkingSpotsListAPI(APIView):
    def get(self, request):
        spots = ParkingSpot.objects.order_by('spot_number')
        active_plates = {
            traffic.parking_spot_id: traffic.plate_number
            for traffic in VehicleTraffic.objects.filter(
                is_inside=True,
                parking_spot__isnull=False,
            ).select_related('parking_spot')
        }

        spots_list = []
        for spot in spots:
            spot_data = ParkingSpotSerializer(spot).data
            if spot.id in active_plates:
                spot_data['license_plate'] = active_plates[spot.id]
            spots_list.append(spot_data)

        return Response({
            "total_capacity": get_parking_capacity(),
            "spots": spots_list,
        })
    
class ShiftListAPI(APIView):
    # دریافت لیست تمام شیفت‌ها (هم فعال و هم تمام شده)
    def get(self, request):
        shifts = OperatorShift.objects.all().order_by('-start_time')
        serializer = OperatorShiftSerializer(shifts, many=True)
        return Response(serializer.data)

class StartShiftAPI(APIView):
    # شروع یک شیفت جدید
    def post(self, request):
        # بررسی اینکه آیا از قبل شیفت فعالی وجود دارد یا خیر
        active_shift_exists = OperatorShift.objects.filter(status='active').exists()
        if active_shift_exists:
            return Response({"error": "یک شیفت فعال از قبل در سیستم وجود دارد."}, status=status.HTTP_400_BAD_REQUEST)
        
        # ساخت شیفت جدید (فعلاً بدون کاربر لاگین شده)
        new_shift = OperatorShift.objects.create(status='active')
        serializer = OperatorShiftSerializer(new_shift)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class EndShiftAPI(APIView):
    # پایان دادن به شیفت فعال
    def post(self, request):
        try:
            active_shift = OperatorShift.objects.get(status='active')
        except OperatorShift.DoesNotExist:
            return Response({"error": "هیچ شیفت فعالی برای پایان دادن یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        
        active_shift = apply_shift_statistics(active_shift, timezone.now())
        serializer = OperatorShiftSerializer(active_shift)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class UserManagementAPI(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        users = User.objects.all().select_related('profile').order_by('-id')
        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        temporary_password = generate_temporary_password()
        user = User.objects.create_user(
            username=data["phone"],
            password=temporary_password,
            first_name=data["name"],
            is_active=data["is_active"],
        )
        UserProfile.objects.create(
            user=user,
            phone=data["phone"],
            role=data["role"],
        )

        return Response({"success": "کاربر با موفقیت ایجاد شد"}, status=status.HTTP_201_CREATED)


class UserDetailAPI(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def _get_user(self, pk):
        try:
            return User.objects.select_related("profile").get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({"error": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserListSerializer(user).data)

    def put(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({"error": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserUpdateSerializer(data=request.data, context={"user": user}, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if user.pk == request.user.pk and serializer.validated_data.get("is_active") is False:
            return Response(
                {"error": "امکان غیرفعال‌سازی حساب کاربری خود وجود ندارد."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = apply_user_update(user, serializer.validated_data)
        except LastManagerError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.select_related("profile").get(pk=user.pk)
        return Response(UserListSerializer(user).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return Response({"error": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if user.pk == request.user.pk:
            return Response(
                {"error": "امکان حذف حساب کاربری خود وجود ندارد."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user_is_active_manager(user) and get_manager_count(exclude_user_id=user.pk) == 0:
            return Response(
                {"error": "امکان حذف آخرین مدیر سیستم وجود ندارد."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response({"success": "کاربر با موفقیت حذف شد"}, status=status.HTTP_200_OK)


class UserResetPasswordAPI(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ResetPasswordSerializer(
            data=request.data,
            context={"user": user},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_password = serializer.validated_data.get("new_password") or generate_temporary_password()
        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {
                "success": "رمز عبور کاربر با موفقیت بازنشانی شد.",
                "temporary_password": new_password,
            },
            status=status.HTTP_200_OK,
        )


class SettingsAPI(APIView):
    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated()]

    def get(self, request):
        settings = ParkingSettings.get_instance()
        return Response(settings_to_response(settings))

    def put(self, request):
        settings = ParkingSettings.get_instance()
        serializer = ParkingSettingsUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        settings = apply_settings_update(settings, serializer.validated_data)
        return Response(settings_to_response(settings), status=status.HTTP_200_OK)


class SettingsAPI(APIView):
    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAuthenticated(), IsManager()]
        return [IsAuthenticated()]

    def get(self, request):
        settings = ParkingSettings.get_instance()
        return Response(settings_to_response(settings))

    def put(self, request):
        settings = ParkingSettings.get_instance()
        serializer = ParkingSettingsUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        settings = apply_settings_update(settings, serializer.validated_data)
        return Response(settings_to_response(settings), status=status.HTTP_200_OK)
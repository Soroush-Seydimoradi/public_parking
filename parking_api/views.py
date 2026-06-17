from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsManager
from django.utils import timezone
from django.db.models import Sum
from .models import Tariff, VehicleTraffic
from .serializers import TariffSerializer, VehicleTrafficSerializer
import decimal
from .models import ParkingSpot
from .serializers import ParkingSpotSerializer
from .models import OperatorShift
from .serializers import OperatorShiftSerializer
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserListSerializer

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
    def post(self, request):
        serializer = VehicleTrafficSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ۲. لیست خودروهایی که همین الان داخل پارکینگ هستند
class ActiveVehiclesAPI(APIView):
    def get(self, request):
        vehicles = VehicleTraffic.objects.filter(is_inside=True).order_by('-entry_time')
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

        return Response(VehicleTrafficSerializer(traffic).data, status=status.HTTP_200_OK)

# ۴. دریافت آمارهای زنده کل پارکینگ برای داشبورد
class DashboardStatsAPI(APIView):
    def get(self, request):
        total_spots = 40  # فرض می‌کنیم ظرفیت کل پارکینگ ۴۰ تاست
        vehicles_inside = VehicleTraffic.objects.filter(is_inside=True).count()
        available_spots = max(0, total_spots - vehicles_inside)
        
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
    
class ParkingSpotsListAPI(APIView):
    def get(self, request):
        # ۱. تعداد ماشین‌هایی که در حال حاضر داخل پارکینگ هستند را می‌شماریم
        occupied_count = VehicleTraffic.objects.filter(is_inside=True).count()
        
        # ۲. فرض می‌کنیم ظرفیت کل پارکینگ شما ۵۰ جایگاه است (می‌توانی این عدد را تغییر دهی)
        TOTAL_SPOTS = 50 
        
        # ۳. محاسبه تعداد جایگاه‌های آزاد
        available_count = max(0, TOTAL_SPOTS - occupied_count)
        
        # ۴. ساختن لیست جایگاه‌ها به صورت داینامیک برای فرانت
        spots_list = []
        
        # ابتدا جایگاه‌های اشغال شده را می‌سازیم
        for i in range(1, occupied_count + 1):
            spots_list.append({
                "id": i,
                "spot_number": f"P-{i:02d}",
                "status": "occupied",
                "floor": 1
            })
            
        # سپس مابقی جایگاه‌ها را به عنوان آزاد پر می‌کنیم
        for i in range(occupied_count + 1, TOTAL_SPOTS + 1):
            spots_list.append({
                "id": i,
                "spot_number": f"P-{i:02d}",
                "status": "available",
                "floor": 1
            })
            
        return Response(spots_list)
    
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
        
        active_shift.end_time = timezone.now()
        active_shift.status = 'completed'
        
        # در دنیای واقعی این مقادیر از فیلتر ماشین‌های ثبت شده در این بازه زمانی محاسبه می‌شوند
        # برای نمونه چند مقدار پیش‌فرض منطقی برای تست ست می‌کنیم:
        active_shift.revenue = 450000
        active_shift.vehicles_entered = 18
        active_shift.vehicles_exited = 12
        
        active_shift.save()
        serializer = OperatorShiftSerializer(active_shift)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class UserManagementAPI(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    # ۱. دریافت لیست کاربران
    def get(self, request):
        users = User.objects.all().select_related('profile').order_by('-id')
        serializer = UserListSerializer(users, many=True)
        return Response(serializer.data)

    # ۲. ایجاد کاربر جدید
    def post(self, request):
        data = request.data
        username = data.get('phone') # از شماره تماس به عنوان نام کاربری استفاده می‌کنیم
        
        if User.objects.filter(username=username).exists():
            return Response({"error": "کاربری با این شماره تماس قبلاً ثبت شده است."}, status=status.HTTP_400_BAD_REQUEST)
        
        # ساخت کاربر در جنگو
        user = User.objects.create_user(
            username=username,
            password="TemporaryPassword123!", # پسورد موقت
            first_name=data.get('name', ''),
            is_active=data.get('is_active', True)
        )
        
        # ساخت پروفایل
        UserProfile.objects.create(
            user=user,
            phone=data.get('phone'),
            role=data.get('role', 'اپراتور')
        )
        
        return Response({"success": "کاربر با موفقیت ایجاد شد"}, status=status.HTTP_201_CREATED)

class UserDeleteAPI(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    # ۳. حذف کاربر
    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.delete()
            return Response({"success": "کاربر با موفقیت حذف شد"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
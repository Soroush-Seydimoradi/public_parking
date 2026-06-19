from django.db import models
from django.contrib.auth.models import User

class Tariff(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="نام تعرفه (نوع خودرو)")
    base_rate = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="هزینه ورودی (تومان)") 
    hourly_rate = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="هزینه هر ساعت اضافه (تومان)") 
    is_active = models.BooleanField(default=True, verbose_name="فعال؟")

    def __str__(self):
        return self.name

class VehicleTraffic(models.Model):
    plate_number = models.CharField(max_length=50, verbose_name="پلاک خودرو") 
    entry_time = models.DateTimeField(auto_now_add=True, verbose_name="زمان ورود")
    exit_time = models.DateTimeField(null=True, blank=True, verbose_name="زمان خروج")
    tariff = models.ForeignKey(Tariff, on_delete=models.PROTECT, verbose_name="تعرفه اعمال شده")
    parking_spot = models.ForeignKey(
        'ParkingSpot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vehicle_sessions',
        verbose_name="جایگاه پارکینگ",
    )
    total_cost = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="هزینه نهایی")
    is_inside = models.BooleanField(default=True, verbose_name="داخل پارکینگ است؟")

    def __str__(self):
        return f"پلاک: {self.plate_number} | وضعیت: {'داخل' if self.is_inside else 'خارج شده'}"

class ParkingSpot(models.Model):
    STATUS_CHOICES = [
        ('available', 'آزاد'),
        ('occupied', 'اشغال'),
        ('reserved', 'رزرو'),
        ('disabled', 'غیرفعال'),
    ]
    
    spot_number = models.CharField(max_length=10, unique=True) # مثلاً A-101
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    floor = models.IntegerField(default=0) # طبقه

    def __str__(self):
        return f"جایگاه {self.spot_number} - {self.get_status_display()}"
    
class OperatorShift(models.Model):
    STATUS_CHOICES = [
        ('active', 'فعال'),
        ('completed', 'پایان یافته'),
    ]
    
    # فعلاً به صورت موقت null=True می‌گذاریم تا بدون لاگین هم کار کند
    operator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    operator_name_fallback = models.CharField(max_length=100, default="اپراتور سیستم")
    
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    
    # آمارهای محاسباتی شیفت
    revenue = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    vehicles_entered = models.IntegerField(default=0)
    vehicles_exited = models.IntegerField(default=0)

    def __str__(self):
        return f"شیفت {self.operator_name_fallback} - {self.get_status_display()}"
    
class ParkingSettings(models.Model):
    total_capacity = models.PositiveIntegerField(
        default=50,
        verbose_name="ظرفیت کل پارکینگ",
    )

    class Meta:
        verbose_name = "تنظیمات پارکینگ"
        verbose_name_plural = "تنظیمات پارکینگ"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def get_capacity(cls) -> int:
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings.total_capacity

    def __str__(self):
        return f"ظرفیت پارکینگ: {self.total_capacity}"


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('مدیر', 'مدیر'),
        ('اپراتور', 'اپراتور'),
        ('کاربر', 'کاربر'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='اپراتور')

    def __str__(self):
        return f"پروفایل {self.user.username}"
from datetime import datetime

from django.db.models import Count, Q, Sum

from .models import OperatorShift, VehicleTraffic


def get_shift_statistics(start_time: datetime, end_time: datetime) -> dict:
    in_shift_window = Q(entry_time__gte=start_time, entry_time__lte=end_time) | Q(
        exit_time__gte=start_time,
        exit_time__lte=end_time,
    )

    stats = VehicleTraffic.objects.filter(in_shift_window).aggregate(
        vehicles_entered=Count(
            "id",
            filter=Q(entry_time__gte=start_time, entry_time__lte=end_time),
        ),
        vehicles_exited=Count(
            "id",
            filter=Q(exit_time__gte=start_time, exit_time__lte=end_time),
        ),
        revenue=Sum(
            "total_cost",
            filter=Q(exit_time__gte=start_time, exit_time__lte=end_time),
        ),
    )

    return {
        "revenue": stats["revenue"] or 0,
        "vehicles_entered": stats["vehicles_entered"] or 0,
        "vehicles_exited": stats["vehicles_exited"] or 0,
    }


def apply_shift_statistics(shift: OperatorShift, end_time: datetime) -> OperatorShift:
    stats = get_shift_statistics(shift.start_time, end_time)
    shift.end_time = end_time
    shift.status = "completed"
    shift.revenue = stats["revenue"]
    shift.vehicles_entered = stats["vehicles_entered"]
    shift.vehicles_exited = stats["vehicles_exited"]
    shift.save()
    return shift

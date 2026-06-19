from datetime import date, datetime, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractHour, TruncDate
from django.utils import timezone

from .capacity import get_parking_capacity
from .models import VehicleTraffic

OCCUPANCY_HOURS = [8, 10, 12, 14, 16, 18, 20, 22]
WEEKDAY_NAMES = {
    5: "شنبه",
    6: "یکشنبه",
    0: "دوشنبه",
    1: "سه‌شنبه",
    2: "چهارشنبه",
    3: "پنجشنبه",
    4: "جمعه",
}


def resolve_date_range(
    range_type: str,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[date, date]:
    today = timezone.localdate()

    if range_type == "today":
        return today, today
    if range_type == "week":
        return today - timedelta(days=6), today
    if range_type == "month":
        return today.replace(day=1), today
    if range_type == "year":
        return today.replace(month=1, day=1), today
    if range_type == "custom":
        if not start_date or not end_date:
            raise ValueError("برای بازه سفارشی، تاریخ شروع و پایان الزامی است.")
        if start_date > end_date:
            raise ValueError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.")
        return start_date, end_date

    raise ValueError("بازه زمانی نامعتبر است.")


def _apply_vehicle_type_filter(queryset, vehicle_type: str | None):
    if vehicle_type and vehicle_type != "all":
        return queryset.filter(tariff__name=vehicle_type)
    return queryset


def _iter_days(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _occupied_at(records: list[tuple[datetime, datetime | None]], moment: datetime) -> int:
    return sum(
        1
        for entry, exit_time in records
        if entry <= moment and (exit_time is None or exit_time >= moment)
    )


def get_revenue_report(
    start: date,
    end: date,
    vehicle_type: str | None = None,
) -> dict:
    queryset = VehicleTraffic.objects.filter(
        exit_time__date__gte=start,
        exit_time__date__lte=end,
        is_inside=False,
    )
    queryset = _apply_vehicle_type_filter(queryset, vehicle_type)

    revenue_rows = (
        queryset.annotate(day=TruncDate("exit_time"))
        .values("day")
        .annotate(amount=Sum("total_cost"))
    )
    amount_by_day = {row["day"]: float(row["amount"] or 0) for row in revenue_rows}

    trend = [
        {"date": current_day.isoformat(), "amount": amount_by_day.get(current_day, 0)}
        for current_day in _iter_days(start, end)
    ]

    total_revenue = sum(item["amount"] for item in trend)
    day_count = max(1, (end - start).days + 1)
    daily_average = total_revenue / day_count

    peak_amount = 0.0
    peak_date = None
    for item in trend:
        if item["amount"] >= peak_amount:
            peak_amount = item["amount"]
            peak_date = item["date"]

    return {
        "trend": trend,
        "summary": {
            "total_revenue": total_revenue,
            "daily_average": daily_average,
            "peak_amount": peak_amount,
            "peak_date": peak_date,
        },
    }


def get_traffic_report(
    start: date,
    end: date,
    vehicle_type: str | None = None,
) -> dict:
    queryset = VehicleTraffic.objects.filter(
        entry_time__date__gte=start,
        entry_time__date__lte=end,
    )
    queryset = _apply_vehicle_type_filter(queryset, vehicle_type)

    rows = (
        queryset.values("tariff__name")
        .annotate(value=Count("id"))
        .order_by("-value")
    )

    return {
        "vehicle_types": [
            {"name": row["tariff__name"], "value": row["value"]} for row in rows
        ]
    }


def get_occupancy_report(
    start: date,
    end: date,
    vehicle_type: str | None = None,
    total_spots: int | None = None,
) -> dict:
    if total_spots is None:
        total_spots = get_parking_capacity()
    queryset = VehicleTraffic.objects.filter(entry_time__date__lte=end).filter(
        Q(exit_time__isnull=True) | Q(exit_time__date__gte=start)
    )
    queryset = _apply_vehicle_type_filter(queryset, vehicle_type)

    records = list(queryset.values_list("entry_time", "exit_time"))
    days = list(_iter_days(start, end))
    day_count = len(days) or 1

    hourly_rates = []
    for hour in OCCUPANCY_HOURS:
        occupied_total = 0
        for current_day in days:
            moment = timezone.make_aware(
                datetime.combine(current_day, datetime.min.time().replace(hour=hour))
            )
            occupied_total += _occupied_at(records, moment)

        average_occupied = occupied_total / day_count
        rate = (
            min(100, round((average_occupied / total_spots) * 100))
            if total_spots > 0
            else 0
        )
        hourly_rates.append({"hour": f"{hour:02d}:00", "rate": rate})

    return {"hourly_rates": hourly_rates}


def get_reports(
    range_type: str,
    start_date: date | None = None,
    end_date: date | None = None,
    vehicle_type: str | None = None,
    total_spots: int | None = None,
) -> dict:
    if total_spots is None:
        total_spots = get_parking_capacity()
    start, end = resolve_date_range(range_type, start_date, end_date)

    return {
        "filters": {
            "range": range_type,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "vehicle_type": vehicle_type or "all",
        },
        "revenue": get_revenue_report(start, end, vehicle_type),
        "traffic": get_traffic_report(start, end, vehicle_type),
        "occupancy": get_occupancy_report(start, end, vehicle_type, total_spots),
    }


def parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)

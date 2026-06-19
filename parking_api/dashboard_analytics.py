from calendar import monthrange
from datetime import date, timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractHour, TruncDate
from django.utils import timezone

from .capacity import get_parking_capacity
from .models import VehicleTraffic

TRAFFIC_HOURS = [8, 10, 12, 14, 16, 18]

WEEKDAY_NAMES = {
    5: "شنبه",
    6: "یکشنبه",
    0: "دوشنبه",
    1: "سه‌شنبه",
    2: "چهارشنبه",
    3: "پنجشنبه",
    4: "جمعه",
}


def _add_months(day: date, months: int) -> date:
    month = day.month + months
    year = day.year
    while month > 12:
        month -= 12
        year += 1
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _occupancy_rate_for_month(
    records: list[tuple[date, date | None]],
    year: int,
    month: int,
    total_spots: int,
) -> int:
    month_start, month_end = _month_bounds(year, month)
    days_in_month = (month_end - month_start).days + 1
    occupied_total = 0

    for day_offset in range(days_in_month):
        current_day = month_start + timedelta(days=day_offset)
        occupied_total += sum(
            1
            for entry_day, exit_day in records
            if entry_day <= current_day
            and (exit_day is None or exit_day >= current_day)
        )

    average_occupied = occupied_total / days_in_month if days_in_month else 0
    if total_spots <= 0:
        return 0
    return min(100, round((average_occupied / total_spots) * 100))


def get_weekly_revenue(today: date) -> list[dict]:
    week_start = today - timedelta(days=6)

    revenue_rows = (
        VehicleTraffic.objects.filter(
            exit_time__date__gte=week_start,
            exit_time__date__lte=today,
            is_inside=False,
        )
        .annotate(day=TruncDate("exit_time"))
        .values("day")
        .annotate(revenue=Sum("total_cost"))
    )
    revenue_by_day = {
        row["day"]: float(row["revenue"] or 0) for row in revenue_rows
    }

    return [
        {
            "name": WEEKDAY_NAMES[(week_start + timedelta(days=offset)).weekday()],
            "revenue": revenue_by_day.get(week_start + timedelta(days=offset), 0),
        }
        for offset in range(7)
    ]


def get_vehicle_type_distribution() -> list[dict]:
    rows = (
        VehicleTraffic.objects.filter(is_inside=True)
        .values("tariff__name")
        .annotate(value=Count("id"))
        .order_by("-value")
    )
    return [{"name": row["tariff__name"], "value": row["value"]} for row in rows]


def get_traffic_today(today: date) -> list[dict]:
    entry_rows = (
        VehicleTraffic.objects.filter(entry_time__date=today)
        .annotate(hour=ExtractHour("entry_time"))
        .values("hour")
        .annotate(count=Count("id"))
    )
    exit_rows = (
        VehicleTraffic.objects.filter(exit_time__date=today)
        .annotate(hour=ExtractHour("exit_time"))
        .values("hour")
        .annotate(count=Count("id"))
    )

    entries_by_hour = {row["hour"]: row["count"] for row in entry_rows}
    exits_by_hour = {row["hour"]: row["count"] for row in exit_rows}

    return [
        {
            "hour": f"{hour:02d}:00",
            "entries": entries_by_hour.get(hour, 0),
            "exits": exits_by_hour.get(hour, 0),
        }
        for hour in TRAFFIC_HOURS
    ]


def get_occupancy_trend(today: date, total_spots: int) -> list[dict]:
    first_month_start = _add_months(today.replace(day=1), -5)
    last_month_end = _month_bounds(today.year, today.month)[1]

    traffic_rows = VehicleTraffic.objects.filter(
        entry_time__date__lte=last_month_end,
    ).filter(
        Q(exit_time__isnull=True) | Q(exit_time__date__gte=first_month_start)
    ).values_list("entry_time", "exit_time")

    records = [
        (entry.date(), exit_time.date() if exit_time else None)
        for entry, exit_time in traffic_rows
    ]

    trend = []
    cursor = first_month_start
    for _ in range(6):
        trend.append(
            {
                "month": cursor.isoformat(),
                "rate": _occupancy_rate_for_month(
                    records,
                    cursor.year,
                    cursor.month,
                    total_spots,
                ),
            }
        )
        cursor = _add_months(cursor, 1)

    return trend


def get_dashboard_charts(total_spots: int | None = None) -> dict:
    if total_spots is None:
        total_spots = get_parking_capacity()
    today = timezone.localdate()

    return {
        "weekly_revenue": get_weekly_revenue(today),
        "vehicle_types": get_vehicle_type_distribution(),
        "traffic_today": get_traffic_today(today),
        "occupancy_trend": get_occupancy_trend(today, total_spots),
    }

import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { formatCurrency, formatPersianDate } from "../lib/utils";
import { Clock, Play, Square, TrendingUp, Users, DollarSign, Car, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DjangoShift {
  id: number;
  operator_name: string;
  start_time: string;
  end_time: string | null;
  status: "active" | "completed";
  revenue: string | number;
  vehicles_entered: number;
  vehicles_exited: number;
}

export function ShiftsPage() {
  const [shifts, setShifts] = useState<DjangoShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchShifts = () => {
    fetch("http://127.0.0.1:8000/api/shifts/")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setShifts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت لیست شیفت‌ها");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  // تابع کمکی برای جلوگیری از کرش کردن سیستم در صورت خرابی فرمت تاریخ
  const safeFormatPersianDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "---";
    try {
      // بررسی صحت تاریخ قبل از ارسال به utils
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        return "تاریخ نامعتبر";
      }
      return formatPersianDate(dateStr);
    } catch (e) {
      return "خطا در فرمت تاریخ";
    }
  };

  const activeShift = shifts.find((s) => s.status === "active");
  const completedShifts = shifts.filter((s) => s.status === "completed");

  const handleStartShift = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/shifts/start/", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطایی رخ داد");
      
      toast.success("شیفت جدید شروع شد");
      fetchShifts();
    } catch (err: any) {
      toast.error(err.message || "شروع شیفت با خطا مواجه شد");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/shifts/end/", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطایی رخ داد");

      toast.success("شیفت فعلی به پایان رسید");
      fetchShifts();
    } catch (err: any) {
      toast.error(err.message || "پایان شیفت با خطا مواجه شد");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>در حال بارگذاری وضعیت شیفت‌ها...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">مدیریت شیفت</h1>
        <p className="text-muted-foreground">مدیریت شیفت‌های کاری اپراتورها (متصل به جنگو)</p>
      </div>

      {activeShift ? (
        <Card className="overflow-hidden border-2 border-success/30">
          <div className="bg-success/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success p-3">
                  <Clock className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">شیفت فعال</h3>
                  <p className="text-sm text-muted-foreground">
                    اپراتور: {activeShift.operator_name || "اپراتور سیستم"}
                  </p>
                </div>
              </div>
              <Badge className="bg-success text-lg px-4 py-2">در حال اجرا</Badge>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Clock className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">شروع شیفت</p>
                    <p className="font-medium">{safeFormatPersianDate(activeShift.start_time)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-warning/10 p-2">
                    <DollarSign className="size-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">درآمد شیفت</p>
                    <p className="font-medium">
                      {formatCurrency(Number(activeShift.revenue || 0))}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-success/10 p-2">
                    <TrendingUp className="size-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ورودی</p>
                    <p className="font-medium">{activeShift.vehicles_entered || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-destructive/10 p-2">
                    <Car className="size-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">خروجی</p>
                    <p className="font-medium">{activeShift.vehicles_exited || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Button 
              onClick={handleEndShift} 
              variant="destructive" 
              size="lg" 
              className="w-full"
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="ml-2 size-5 animate-spin" /> : <Square className="ml-2 size-5" />}
              پایان شیفت کاری
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Clock className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">شیفتی فعال نیست</h3>
          <p className="mb-6 text-muted-foreground">برای شروع کار و ثبت تراکنش‌ها، یک شیفت جدید را آغاز کنید</p>
          <Button onClick={handleStartShift} size="lg" disabled={actionLoading}>
            {actionLoading ? <Loader2 className="ml-2 size-5 animate-spin" /> : <Play className="ml-2 size-5" />}
            شروع شیفت جدید
          </Button>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-xl font-semibold">تاریخچه شیفت‌ها</h2>
        <div className="space-y-4">
          {completedShifts.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground">هیچ شیفت پایان‌یافته‌ای ثبت نشده است.</div>
          ) : (
            completedShifts.map((shift) => (
              <Card key={shift.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <Users className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{shift.operator_name || "اپراتور سیستم"}</p>
                      <p className="text-sm text-muted-foreground">
                        {safeFormatPersianDate(shift.start_time)} {shift.end_time && `تا ${safeFormatPersianDate(shift.end_time)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">درآمد</p>
                      <p className="font-semibold">{formatCurrency(Number(shift.revenue || 0))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ورودی</p>
                      <p className="font-semibold text-success">{shift.vehicles_entered || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">خروجی</p>
                      <p className="font-semibold text-destructive">{shift.vehicles_exited || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
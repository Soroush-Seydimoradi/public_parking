import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { formatCurrency, formatDuration, formatPersianDate } from "../lib/utils";
import { Search, Clock, DollarSign, Car, Printer, CheckCircle2, Loader2 } from "lucide-react";
import { Separator } from "../components/ui/separator";
import { motion, AnimatePresence } from "motion/react";

// ساختار داده خودروها که از جنگو دریافت می‌شود
interface VehicleTraffic {
  id: number;
  plate_number: string;
  entry_time: string;
  entry_time_formatted: string;
  tariff_details: {
    name: string;
    base_rate: string;
    hourly_rate: string;
  };
  total_cost: string;
  is_inside: boolean;
}

export function VehicleExitPage() {
  const [searchPlate, setSearchPlate] = useState("");
  const [activeVehicles, setActiveVehicles] = useState<VehicleTraffic[]>([]);
  const [foundVehicle, setFoundVehicle] = useState<VehicleTraffic | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ۱. دریافت لیست خودروهای داخل پارکینگ از جنگو
  const fetchActiveVehicles = () => {
    fetch("http://127.0.0.1:8000/api/active-vehicles/")
      .then((res) => res.json())
      .then((data) => {
        setActiveVehicles(data);
        setLoadingList(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت لیست خودروهای داخل پارکینگ");
        setLoadingList(false);
      });
  };

  useEffect(() => {
    fetchActiveVehicles();
  }, []);

  // ۲. جستجوی خودرو بین ماشین‌های داخل پارکینگ
  const handleSearch = () => {
    if (!searchPlate.trim()) {
      toast.error("لطفاً پلاک را وارد کنید");
      return;
    }

    const vehicle = activeVehicles.find((v) =>
      v.plate_number.includes(searchPlate)
    );

    if (vehicle) {
      setFoundVehicle(vehicle);
      toast.success("خودرو پیدا شد");
    } else {
      toast.error("خودرویی با این پلاک در حال حاضر داخل پارکینگ نیست");
      setFoundVehicle(null);
    }
  };

  // ۳. ارسال درخواست خروج به جنگو و دریافت هزینه نهایی دیتابیس
  const handleExit = async () => {
    if (!foundVehicle) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/vehicle-exit/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traffic_id: foundVehicle.id }),
      });

      if (!response.ok) throw new Error();

      const updatedVehicleData = await response.json();
      
      // به‌روزرسانی آبجکت پیدا شده با اطلاعات نهایی (شامل قیمت نهایی محاسبه شده توسط جنگو)
      setFoundVehicle(updatedVehicleData);
      setShowReceipt(true);
      toast.success("خروج خودرو با موفقیت در دیتابیس ثبت شد");

      // تازه کردن لیست سمت راست پس از خروج ماشین
      fetchActiveVehicles();

      setTimeout(() => {
        setShowReceipt(false);
        setFoundVehicle(null);
        setSearchPlate("");
      }, 6000);
    } catch (error) {
      toast.error("خطا در ثبت خروج خودرو");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    toast.success("رسید در حال چاپ است...");
  };

  // محاسبه مدت زمان تقریبی حضور (به دقیقه) برای نمایش در فرم پیش‌نمایش
  const getDurationMinutes = () => {
    if (!foundVehicle) return 0;
    const start = new Date(foundVehicle.entry_time).getTime();
    const now = Date.now();
    return Math.max(1, Math.floor((now - start) / 60000));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">خروج خودرو</h1>
        <p className="text-muted-foreground">ثبت خروج و محاسبه هوشمند هزینه توسط دیتابیس</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Search & Action Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="flex items-center gap-2">
                  <Search className="size-4" />
                  جستجوی پلاک خودروهای داخل پارکینگ
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    type="text"
                    placeholder="بخشی از پلاک یا پلاک کامل را بنویسید..."
                    value={searchPlate}
                    onChange={(e) => setSearchPlate(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-14 text-lg text-center"
                  />
                  <Button onClick={handleSearch} size="lg" className="px-8">
                    <Search className="size-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Vehicle Info Card */}
          {foundVehicle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden border-2 border-primary/20">
                <div className="bg-primary/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold">اطلاعات خودرو</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <Car className="size-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">پلاک خودرو</p>
                        <p className="text-lg font-semibold">{foundVehicle.plate_number}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-success/10 p-3">
                        <Car className="size-6 text-success" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">نوع تعرفه</p>
                        <p className="text-lg font-semibold">{foundVehicle.tariff_details?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-info/10 p-3">
                        <Clock className="size-6 text-info" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ساعت ورود</p>
                        <p className="font-medium">{foundVehicle.entry_time_formatted} (امروز)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-warning/10 p-3">
                        <Clock className="size-6 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">مدت تخمینی حضور</p>
                        <p className="font-medium">{formatDuration(getDurationMinutes())}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Confirm Actions */}
                <div className="p-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    * توجه: مبلغ نهایی با زدن دکمه ثبت خروج، راساً توسط سیستم مالی سرور محاسبه و فاکتور خواهد شد.
                  </p>

                  <div className="flex gap-3">
                    <Button onClick={handleExit} size="lg" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="animate-spin size-5 ml-2" />
                      ) : (
                        <CheckCircle2 className="ml-2 size-5" />
                      )}
                      محاسبه قیمت و ثبت خروج
                    </Button>
                    <Button onClick={handlePrint} variant="outline" size="lg">
                      <Printer className="size-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar - Vehicles Inside */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-2 font-semibold">خودروهای حاضر در پارکینگ</h3>
            <p className="text-xs text-muted-foreground mb-4">جهت انتخاب سریع، روی پلاک کلیک کنید</p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {loadingList ? (
                <div className="text-center p-4 text-xs text-muted-foreground">در حال دریافت لیست...</div>
              ) : activeVehicles.length === 0 ? (
                <div className="text-center p-4 text-xs text-muted-foreground">پارکینگ کاملاً خالی است</div>
              ) : (
                activeVehicles.map((vehicle) => (
                  <Button
                    key={vehicle.id}
                    variant="ghost"
                    className="w-full justify-start hover:bg-primary/5 border border-transparent hover:border-primary/10"
                    onClick={() => {
                      setSearchPlate(vehicle.plate_number);
                      setFoundVehicle(vehicle);
                    }}
                  >
                    <Car className="ml-2 size-4 text-muted-foreground" />
                    <div className="flex w-full justify-between text-xs">
                      <span className="font-medium">{vehicle.plate_number}</span>
                      <span className="text-muted-foreground">{vehicle.entry_time_formatted}</span>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Live Receipt Modal */}
      <AnimatePresence>
        {showReceipt && foundVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
            >
              <Card className="p-8 border-2 border-success/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-2 bg-success" />
                <div className="mb-6 text-center">
                  <CheckCircle2 className="mx-auto size-16 text-success" />
                  <h2 className="mt-4 text-2xl font-bold">رسید نهایی خروج</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    فاکتور سیستم پردازش مالی جنگو
                  </p>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">پلاک خودرو:</span>
                    <span className="font-bold text-base">{foundVehicle.plate_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نوع تعرفه ورودی:</span>
                    <span className="font-medium">{foundVehicle.tariff_details?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ساعت ورود:</span>
                    <span className="font-medium">{foundVehicle.entry_time_formatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ساعت خروج:</span>
                    <span className="font-medium">
                      {new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold bg-primary/5 p-3 rounded-lg">
                    <span>مبلغ نهایی فاکتور:</span>
                    <span className="text-primary">{formatCurrency(Number(foundVehicle.total_cost))}</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                  <Button onClick={handlePrint} className="w-full" variant="outline">
                    <Printer className="ml-2 size-4" /> چاپ مجدد رسید
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
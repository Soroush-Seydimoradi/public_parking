import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { mockParkingSpots } from "../lib/mock-data";
import { ParkingSpotCard } from "../components/parking-spot-card";
import { Car, Clock, User, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TariffOption {
  id: number;
  name: string;
}

export function VehicleEntryPage() {
  const [licensePlate, setLicensePlate] = useState("");
  const [selectedTariffId, setSelectedTariffId] = useState(""); // ذخیره آیدی تعرفه برای جنگو
  const [selectedSpot, setSelectedSpot] = useState("");
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // استیت‌های مربوط به دریافت تعرفه‌ها از جنگو
  const [tariffs, setTariffs] = useState<TariffOption[]>([]);
  const [loadingTariffs, setLoadingTariffs] = useState(true);

  const availableSpots = mockParkingSpots.filter((s) => s.status === "available");

  // ۱. گرفتن لیست تعرفه‌های زنده از جنگو هنگام باز شدن صفحه
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/tariffs/")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setTariffs(data);
        setLoadingTariffs(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت لیست تعرفه‌ها از سرور");
        setLoadingTariffs(false);
      });
  }, []);

  // ۲. ارسال اطلاعات فرم ورود خودرو به جنگو
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licensePlate || !selectedTariffId || !selectedSpot) {
      toast.error("لطفاً تمام فیلدهای الزامی را پر کنید");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/vehicle-entry/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plate_number: licensePlate,
          tariff: Number(selectedTariffId), // ارسال آیدی تعرفه به جنگو
        }),
      });

      if (!response.ok) {
        throw new Error("خطا در ثبت اطلاعات در سرور");
      }

      // نمایش انیمیشن موفقیت
      setShowSuccess(true);
      toast.success("خودرو با موفقیت در دیتابیس ثبت شد");

      setTimeout(() => {
        setShowSuccess(false);
        setLicensePlate("");
        setSelectedTariffId("");
        setSelectedSpot("");
        setNotes("");
      }, 3000);
    } catch (error) {
      console.error(error);
      toast.error("ثبت خودرو با خطا مواجه شد. اتصال سرور را بررسی کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ورود خودرو</h1>
        <p className="text-muted-foreground">ثبت ورود خودرو جدید به پارکینگ (متصل به دیتابیس)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Entry Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* License Plate */}
              <div className="space-y-2">
                <Label htmlFor="licensePlate" className="flex items-center gap-2">
                  <Car className="size-4" />
                  پلاک خودرو
                </Label>
                <Input
                  id="licensePlate"
                  type="text"
                  placeholder="مثال: 12 الف 345 ایران 67"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="h-14 text-lg text-center"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  پلاک را به صورت کامل و با فاصله وارد کنید
                </p>
              </div>

              {/* Vehicle Type / Tariff Selection */}
              <div className="space-y-2">
                <Label htmlFor="vehicleType" className="flex items-center gap-2">
                  <Car className="size-4" />
                  نوع خودرو (تعرفه دیتابیس)
                </Label>
                <Select value={selectedTariffId} onValueChange={setSelectedTariffId} required>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={loadingTariffs ? "در حال بارگذاری..." : "انتخاب کنید"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tariffs.map((tariff) => (
                      <SelectItem key={tariff.id} value={tariff.id.toString()}>
                        {tariff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parking Spot */}
              <div className="space-y-2">
                <Label htmlFor="spot" className="flex items-center gap-2">
                  <FileText className="size-4" />
                  جایگاه پارکینگ
                </Label>
                <Select value={selectedSpot} onValueChange={setSelectedSpot} required>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSpots.slice(0, 20).map((spot) => (
                      <SelectItem key={spot.id} value={spot.number}>
                        {spot.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator (Auto-filled) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="size-4" />
                  اپراتور
                </Label>
                <Input value="علی احمدی" disabled className="h-12" />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="size-4" />
                  یادداشت (اختیاری)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="توضیحات اضافی..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 size-5 animate-spin" />
                    در حال ثبت در دیتابیس...
                  </>
                ) : (
                  "ثبت ورود خودرو"
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Current Info */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">اطلاعات فعلی</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ظرفیت خالی</span>
                <span className="font-semibold text-success">{availableSpots.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ظرفیت کل</span>
                <span className="font-semibold">{mockParkingSpots.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">زمان</span>
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="size-4" />
                  {new Date().toLocaleTimeString("fa-IR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </Card>

          {/* Available Spots Preview */}
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">جایگاه‌های خالی</h3>
            <div className="grid grid-cols-3 gap-2">
              {availableSpots.slice(0, 9).map((spot) => (
                <ParkingSpotCard
                  key={spot.id}
                  spot={spot}
                  onClick={() => setSelectedSpot(spot.number)}
                />
              ))}
            </div>
            {availableSpots.length > 9 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                و {availableSpots.length - 9} جایگاه دیگر...
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="rounded-2xl bg-card p-8 shadow-2xl"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <CheckCircle2 className="mx-auto size-20 text-success" />
                </motion.div>
                <h2 className="mt-4 text-2xl font-bold">ثبت موفق!</h2>
                <p className="mt-2 text-muted-foreground">خودرو با موفقیت وارد پارکینگ شد</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
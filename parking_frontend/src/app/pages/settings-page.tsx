import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Settings, Bell, Shield, Database } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { apiFetch, apiGet } from "../lib/api";

interface ParkingSettingsData {
  parking_name: string;
  address: string;
  phone: string;
  total_capacity: number;
  auto_dark_mode: boolean;
  show_help: boolean;
  notify_vehicle_entry: boolean;
  notify_vehicle_exit: boolean;
  notify_capacity_full: boolean;
  notify_daily_revenue: boolean;
  notification_email: string;
}

const defaultSettings: ParkingSettingsData = {
  parking_name: "پارکینگ هوشمند",
  address: "تهران، خیابان ولیعصر، پلاک 123",
  phone: "021-12345678",
  total_capacity: 50,
  auto_dark_mode: true,
  show_help: true,
  notify_vehicle_entry: true,
  notify_vehicle_exit: true,
  notify_capacity_full: true,
  notify_daily_revenue: false,
  notification_email: "",
};

function extractErrorMessage(data: Record<string, unknown>) {
  if (typeof data.error === "string") return data.error;
  const fieldErrors = Object.values(data).flatMap((value) =>
    Array.isArray(value) ? value.map(String) : typeof value === "string" ? [value] : []
  );
  return fieldErrors[0] || "خطا در ذخیره تنظیمات";
}

export function SettingsPage() {
  const [settings, setSettings] = useState<ParkingSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    apiGet<ParkingSettingsData>("/api/settings/")
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت تنظیمات");
        setLoading(false);
      });
  }, []);

  const updateSettings = async (
    payload: Partial<ParkingSettingsData>,
    setSaving: (value: boolean) => void
  ) => {
    setSaving(true);
    try {
      const response = await apiFetch("/api/settings/", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(extractErrorMessage(data));
      setSettings(data as ParkingSettingsData);
      toast.success("تنظیمات با موفقیت ذخیره شد");
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره تنظیمات");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneralSave = () => {
    updateSettings(
      {
        parking_name: settings.parking_name,
        address: settings.address,
        phone: settings.phone,
        total_capacity: settings.total_capacity,
        auto_dark_mode: settings.auto_dark_mode,
        show_help: settings.show_help,
      },
      setGeneralSaving
    );
  };

  const handleNotificationSave = () => {
    updateSettings(
      {
        notify_vehicle_entry: settings.notify_vehicle_entry,
        notify_vehicle_exit: settings.notify_vehicle_exit,
        notify_capacity_full: settings.notify_capacity_full,
        notify_daily_revenue: settings.notify_daily_revenue,
        notification_email: settings.notification_email,
      },
      setNotificationSaving
    );
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("لطفاً تمام فیلدهای رمز عبور را پر کنید");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await apiFetch("/api/auth/change-password/", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractErrorMessage(data));
      }

      toast.success("رمز عبور با موفقیت تغییر کرد");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "خطا در تغییر رمز عبور");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">تنظیمات</h1>
          <p className="text-muted-foreground">در حال بارگذاری تنظیمات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">تنظیمات</h1>
        <p className="text-muted-foreground">پیکربندی سیستم مدیریت پارکینگ</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="size-4" />
            عمومی
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="size-4" />
            اعلان‌ها
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="size-4" />
            امنیت
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="size-4" />
            داده‌ها
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Settings className="size-5" />
                  تنظیمات عمومی
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parkingName">نام پارکینگ</Label>
                <Input
                  id="parkingName"
                  value={settings.parking_name}
                  onChange={(e) => setSettings((prev) => ({ ...prev, parking_name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">آدرس</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">شماره تماس</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => setSettings((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">ظرفیت کل</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={settings.total_capacity}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        total_capacity: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>حالت تاریک خودکار</Label>
                  <p className="text-sm text-muted-foreground">
                    استفاده از تم سیستم‌عامل
                  </p>
                </div>
                <Switch
                  checked={settings.auto_dark_mode}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, auto_dark_mode: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>نمایش راهنما</Label>
                  <p className="text-sm text-muted-foreground">
                    نمایش راهنمای استفاده در صفحات
                  </p>
                </div>
                <Switch
                  checked={settings.show_help}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, show_help: checked }))
                  }
                />
              </div>

              <Button onClick={handleGeneralSave} className="w-full" disabled={generalSaving}>
                ذخیره تغییرات
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Bell className="size-5" />
                  تنظیمات اعلان‌ها
                </h3>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان ورود خودرو</Label>
                  <p className="text-sm text-muted-foreground">
                    اعلان هنگام ثبت ورود خودرو جدید
                  </p>
                </div>
                <Switch
                  checked={settings.notify_vehicle_entry}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, notify_vehicle_entry: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان خروج خودرو</Label>
                  <p className="text-sm text-muted-foreground">
                    اعلان هنگام ثبت خروج خودرو
                  </p>
                </div>
                <Switch
                  checked={settings.notify_vehicle_exit}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, notify_vehicle_exit: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان ظرفیت کامل</Label>
                  <p className="text-sm text-muted-foreground">
                    هشدار هنگام پر شدن ظرفیت پارکینگ
                  </p>
                </div>
                <Switch
                  checked={settings.notify_capacity_full}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, notify_capacity_full: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان درآمد روزانه</Label>
                  <p className="text-sm text-muted-foreground">
                    گزارش درآمد در پایان هر روز
                  </p>
                </div>
                <Switch
                  checked={settings.notify_daily_revenue}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, notify_daily_revenue: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email">ایمیل برای دریافت گزارشات</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={settings.notification_email}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, notification_email: e.target.value }))
                  }
                />
              </div>

              <Button onClick={handleNotificationSave} className="w-full" disabled={notificationSaving}>
                ذخیره تغییرات
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Shield className="size-5" />
                  تنظیمات امنیتی
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">رمز عبور جدید</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>احراز هویت دو مرحله‌ای</Label>
                  <p className="text-sm text-muted-foreground">
                    افزایش امنیت با کد تأیید پیامکی
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>خروج خودکار</Label>
                  <p className="text-sm text-muted-foreground">
                    خروج پس از 30 دقیقه عدم فعالیت
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button onClick={handlePasswordChange} className="w-full" disabled={passwordLoading}>
                ذخیره تغییرات
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Database className="size-5" />
                  مدیریت داده‌ها
                </h3>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-2 font-medium">پشتیبان‌گیری خودکار</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  پشتیبان‌گیری خودکار از داده‌های سیستم هر شب ساعت 2 بامداد
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">فعال‌سازی پشتیبان‌گیری خودکار</span>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h4 className="mb-2 font-medium">پشتیبان دستی</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  ایجاد نسخه پشتیبان از تمام داده‌های سیستم
                </p>
                <Button variant="outline" className="w-full">
                  ایجاد پشتیبان
                </Button>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h4 className="mb-2 font-medium text-destructive">منطقه خطر</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  حذف تمام داده‌های سیستم (غیرقابل بازگشت)
                </p>
                <Button variant="destructive" className="w-full">
                  حذف تمام داده‌ها
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

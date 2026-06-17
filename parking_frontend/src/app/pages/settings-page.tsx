import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Settings, Bell, Shield, Database, Palette } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export function SettingsPage() {
  const handleSave = () => {
    toast.success("تنظیمات با موفقیت ذخیره شد");
  };

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
                <Input id="parkingName" defaultValue="پارکینگ هوشمند" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">آدرس</Label>
                <Input id="address" defaultValue="تهران، خیابان ولیعصر، پلاک 123" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">شماره تماس</Label>
                  <Input id="phone" defaultValue="021-12345678" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">ظرفیت کل</Label>
                  <Input id="capacity" type="number" defaultValue="50" />
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
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>نمایش راهنما</Label>
                  <p className="text-sm text-muted-foreground">
                    نمایش راهنمای استفاده در صفحات
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button onClick={handleSave} className="w-full">
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
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان خروج خودرو</Label>
                  <p className="text-sm text-muted-foreground">
                    اعلان هنگام ثبت خروج خودرو
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان ظرفیت کامل</Label>
                  <p className="text-sm text-muted-foreground">
                    هشدار هنگام پر شدن ظرفیت پارکینگ
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>اعلان درآمد روزانه</Label>
                  <p className="text-sm text-muted-foreground">
                    گزارش درآمد در پایان هر روز
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email">ایمیل برای دریافت گزارشات</Label>
                <Input id="email" type="email" placeholder="example@email.com" />
              </div>

              <Button onClick={handleSave} className="w-full">
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
                <Input id="currentPassword" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">رمز عبور جدید</Label>
                <Input id="newPassword" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
                <Input id="confirmPassword" type="password" />
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

              <Button onClick={handleSave} className="w-full">
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

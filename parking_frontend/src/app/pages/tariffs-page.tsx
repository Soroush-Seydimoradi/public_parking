import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { formatCurrency } from "../lib/utils";
import { Car, Truck, Bike, Package, Save, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { apiFetch, apiGet } from "../lib/api";

const vehicleIcons = {
  "سواری": Car,
  "وانت": Truck,
  "موتور": Bike,
  "کامیون": Package,
};

interface DjangoTariff {
  id: number;
  name: string;
  base_rate: string;
  hourly_rate: string;
  is_active: boolean;
}

export function TariffsPage() {
  const [tariffs, setTariffs] = useState<DjangoTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    apiGet<DjangoTariff[]>("/api/tariffs/")
      .then((data) => {
        setTariffs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("ارتباط با سرور جنگو برقرار نشد");
        setLoading(false);
      });
  }, []);

  const handleInputChange = (id: number, field: 'base_rate' | 'hourly_rate', value: string) => {
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = async (tariff: DjangoTariff) => {
    setSavingId(tariff.id);
    try {
      const response = await apiFetch("/api/tariffs/", {
        method: "PUT",
        body: JSON.stringify({
          id: tariff.id,
          base_rate: tariff.base_rate,
          hourly_rate: tariff.hourly_rate
        })
      });

      if (!response.ok) throw new Error();
      
      toast.success(`تعرفه ${tariff.name} با موفقیت در دیتابیس بروزرسانی شد`);
    } catch (error) {
      toast.error("خطا در ذخیره‌سازی اطلاعات روی سرور");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>در حال بارگذاری تعرفه‌ها از دیتابیس...</span>
      </div>
    );
  }

  if (tariffs.length === 0) {
    return (
      <div className="text-center p-12">
        <p className="text-muted-foreground">هیچ تعرفه فعالی در پنل ادمین جنگو تعریف نشده است.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">مدیریت تعرفه</h1>
        <p className="text-muted-foreground">تنظیم قیمت‌ها برای انواع خودرو (متصل به جنگو)</p>
      </div>

      <Tabs defaultValue={tariffs[0].name} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {tariffs.map((tariff) => {
            const Icon = vehicleIcons[tariff.name] || Car;
            return (
              <TabsTrigger key={tariff.id} value={tariff.name} className="gap-2">
                <Icon className="size-4" />
                {tariff.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tariffs.map((tariff) => {
          const Icon = vehicleIcons[tariff.name] || Car;
          const firstHour = Number(tariff.base_rate);
          const additionalHour = Number(tariff.hourly_rate);
          const dailyFee = firstHour + (23 * additionalHour);

          return (
            <TabsContent key={tariff.id} value={tariff.name} className="mt-6">
              <Card className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="size-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">تعرفه {tariff.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      تنظیم قیمت‌های پارکینگ برای {tariff.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`first-${tariff.id}`}>ساعت اول (ورودی)</Label>
                      <Input
                        id={`first-${tariff.id}`}
                        type="number"
                        value={tariff.base_rate}
                        onChange={(e) => handleInputChange(tariff.id, 'base_rate', e.target.value)}
                        className="text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        فعلی: {formatCurrency(firstHour)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`additional-${tariff.id}`}>ساعت‌های بعدی</Label>
                      <Input
                        id={`additional-${tariff.id}`}
                        type="number"
                        value={tariff.hourly_rate}
                        onChange={(e) => handleInputChange(tariff.id, 'hourly_rate', e.target.value)}
                        className="text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        فعلی: {formatCurrency(additionalHour)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`daily-${tariff.id}`}>تعرفه ۲۴ ساعته (نمایشی)</Label>
                      <Input
                        id={`daily-${tariff.id}`}
                        type="number"
                        value={dailyFee}
                        disabled
                        className="text-lg bg-secondary/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        محاسباتی: {formatCurrency(dailyFee)}
                      </p>
                    </div>
                  </div>

                  <Card className="border-primary/20 bg-primary/5 p-4">
                    <h4 className="mb-3 font-medium">نمونه محاسبات واقعی</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">1 ساعت:</span>
                        <span className="font-medium">{formatCurrency(firstHour)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">3 ساعت:</span>
                        <span className="font-medium">
                          {formatCurrency(firstHour + 2 * additionalHour)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">یک روز کامل:</span>
                        <span className="font-medium">{formatCurrency(dailyFee)}</span>
                      </div>
                    </div>
                  </Card>

                  <Button 
                    onClick={() => handleSave(tariff)} 
                    size="lg" 
                    className="w-full"
                    disabled={savingId === tariff.id}
                  >
                    {savingId === tariff.id ? (
                      <Loader2 className="ml-2 size-5 animate-spin" />
                    ) : (
                      <Save className="ml-2 size-5" />
                    )}
                    ذخیره تغییرات تعرفه {tariff.name}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
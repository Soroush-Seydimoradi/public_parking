import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { ParkingSpotCard } from "../components/parking-spot-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DjangoParkingSpot {
  id: number;
  spot_number: string;
  status: "available" | "occupied" | "reserved" | "disabled";
  floor: number;
}

export function ParkingSpotsPage() {
  const [spots, setSpots] = useState<DjangoParkingSpot[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // دریافت اطلاعات زنده جایگاه‌ها از جنگو
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/parking-spots/")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSpots(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت وضعیت جایگاه‌های پارکینگ");
        setLoading(false);
      });
  }, []);

  const filteredSpots = spots.filter(
    (spot) => filterStatus === "all" || spot.status === filterStatus
  );

  const statusCounts = {
    all: spots.length,
    available: spots.filter((s) => s.status === "available").length,
    occupied: spots.filter((s) => s.status === "occupied").length,
    reserved: spots.filter((s) => s.status === "reserved").length,
    disabled: spots.filter((s) => s.status === "disabled").length,
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>در حال دریافت وضعیت زنده پارکینگ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">جایگاه‌های پارکینگ</h1>
        <p className="text-muted-foreground">نمای کلی تمام جایگاه‌های پارکینگ (متصل به سرور)</p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">آزاد</p>
              <p className="text-2xl font-bold text-success">{statusCounts.available}</p>
            </div>
            <div className="rounded-lg bg-success/10 p-3">
              <div className="size-8 rounded-full bg-success"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">اشغال</p>
              <p className="text-2xl font-bold text-destructive">{statusCounts.occupied}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <div className="size-8 rounded-full bg-destructive"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">رزرو</p>
              <p className="text-2xl font-bold text-warning">{statusCounts.reserved}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3">
              <div className="size-8 rounded-full bg-warning"></div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">غیرفعال</p>
              <p className="text-2xl font-bold text-muted-foreground">{statusCounts.disabled}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="size-8 rounded-full bg-border"></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">همه ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="available">آزاد ({statusCounts.available})</TabsTrigger>
          <TabsTrigger value="occupied">اشغال ({statusCounts.occupied})</TabsTrigger>
          <TabsTrigger value="reserved">رزرو ({statusCounts.reserved})</TabsTrigger>
          <TabsTrigger value="disabled">غیرفعال ({statusCounts.disabled})</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="mt-6">
          <Card className="p-6">
            <div className="grid gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {filteredSpots.map((spot) => (
                // تبدیل ساختار داده جنگو به ساختار مورد نیاز کامپوننت کارت جایگاه
                <ParkingSpotCard 
                  key={spot.id} 
                  spot={{
                    id: spot.id,
                    number: spot.spot_number,
                    status: spot.status,
                    type: "regular" // یا هر فیلد فرضی دیگری که کامپوننت داخلی استفاده می‌کند
                  }} 
                />
              ))}
            </div>

            {filteredSpots.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                جایگاهی با این وضعیت یافت نشد
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
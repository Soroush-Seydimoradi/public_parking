import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { ParkingSpotCard } from "../components/parking-spot-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "../lib/api";

interface DjangoParkingSpot {
  id: number;
  spot_number: string;
  status: "available" | "occupied" | "reserved" | "disabled";
  floor: number;
}

interface ParkingSpotsResponse {
  total_capacity: number;
  spots: DjangoParkingSpot[];
}

export function ParkingSpotsPage() {
  const [spots, setSpots] = useState<DjangoParkingSpot[]>([]);
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // دریافت اطلاعات زنده جایگاه‌ها از جنگو
  useEffect(() => {
    apiGet<ParkingSpotsResponse>("/api/parking-spots/")
      .then((data) => {
        setSpots(data.spots);
        setTotalCapacity(data.total_capacity);
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
        <p className="text-muted-foreground">
          نمای کلی {totalCapacity} جایگاه پارکینگ (متصل به سرور)
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ظرفیت کل</p>
              <p className="text-2xl font-bold">{totalCapacity}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <div className="size-8 rounded-full bg-primary"></div>
            </div>
          </div>
        </Card>
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

      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">همه ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="available">آزاد ({statusCounts.available})</TabsTrigger>
          <TabsTrigger value="occupied">اشغال ({statusCounts.occupied})</TabsTrigger>
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
import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { formatPersianDate, formatDuration } from "../lib/utils";
import { apiGet } from "../lib/api";
import { Search, Filter, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

interface VehicleTraffic {
  id: number;
  plate_number: string;
  entry_time: string;
  entry_time_formatted: string;
  entry_operator_username: string | null;
  tariff_details: {
    name: string;
    base_rate: string;
    hourly_rate: string;
  };
  parking_spot_details?: {
    spot_number: string;
  } | null;
  is_inside: boolean;
}

export function ActiveVehiclesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [activeVehicles, setActiveVehicles] = useState<VehicleTraffic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<VehicleTraffic[]>("/api/active-vehicles/")
      .then((data) => {
        setActiveVehicles(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("خطا در دریافت لیست خودروهای فعال");
        setLoading(false);
      });
  }, []);

  const filteredVehicles = activeVehicles.filter((vehicle) => {
    const vehicleType = vehicle.tariff_details?.name ?? "";
    const spotNumber = vehicle.parking_spot_details?.spot_number ?? "";
    const matchesSearch =
      vehicle.plate_number.includes(searchTerm) ||
      spotNumber.includes(searchTerm);
    const matchesType = filterType === "all" || vehicleType === filterType;
    return matchesSearch && matchesType;
  });

  const getDuration = (entryTime: string) => {
    const minutes = Math.floor((Date.now() - new Date(entryTime).getTime()) / 60000);
    return formatDuration(Math.max(0, minutes));
  };

  const formatEntryTime = (entryTime: string) => {
    const parsed = new Date(entryTime);
    if (Number.isNaN(parsed.getTime())) {
      return entryTime;
    }
    return formatPersianDate(parsed);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>در حال دریافت لیست خودروهای فعال...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">خودروهای فعال</h1>
          <p className="text-muted-foreground">
            {filteredVehicles.length} خودرو در پارکینگ
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {activeVehicles.length} خودرو فعال
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="جستجوی پلاک یا جایگاه..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <Filter className="ml-2 size-4" />
              <SelectValue placeholder="نوع خودرو" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="سواری">سواری</SelectItem>
              <SelectItem value="وانت">وانت</SelectItem>
              <SelectItem value="موتور">موتور</SelectItem>
              <SelectItem value="کامیون">کامیون</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">پلاک</TableHead>
                <TableHead className="text-right">نوع خودرو</TableHead>
                <TableHead className="text-right">زمان ورود</TableHead>
                <TableHead className="text-right">مدت پارک</TableHead>
                <TableHead className="text-right">جایگاه</TableHead>
                <TableHead className="text-right">اپراتور</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    خودرویی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.plate_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{vehicle.tariff_details?.name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatEntryTime(vehicle.entry_time)}
                    </TableCell>
                    <TableCell className="font-medium">{getDuration(vehicle.entry_time)}</TableCell>
                    <TableCell>
                      <Badge>{vehicle.parking_spot_details?.spot_number ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{vehicle.entry_operator_username ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        فعال
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

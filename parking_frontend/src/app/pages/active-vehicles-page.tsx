import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { mockVehicles } from "../lib/mock-data";
import { formatPersianDate, formatDuration } from "../lib/utils";
import { Search, Eye, DoorOpen, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export function ActiveVehiclesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const activeVehicles = mockVehicles.filter((v) => v.status === "active");

  const filteredVehicles = activeVehicles.filter((vehicle) => {
    const matchesSearch = vehicle.licensePlate.includes(searchTerm) || vehicle.spotNumber.includes(searchTerm);
    const matchesType = filterType === "all" || vehicle.vehicleType === filterType;
    return matchesSearch && matchesType;
  });

  const getDuration = (entryTime: Date) => {
    const minutes = Math.floor((Date.now() - entryTime.getTime()) / 60000);
    return formatDuration(minutes);
  };

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
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    خودرویی یافت نشد
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{vehicle.vehicleType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatPersianDate(vehicle.entryTime)}
                    </TableCell>
                    <TableCell className="font-medium">{getDuration(vehicle.entryTime)}</TableCell>
                    <TableCell>
                      <Badge>{vehicle.spotNumber}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{vehicle.operator}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        فعال
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <DoorOpen className="size-4" />
                        </Button>
                      </div>
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

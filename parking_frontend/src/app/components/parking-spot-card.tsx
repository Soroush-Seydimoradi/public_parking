import { Card } from "./ui/card";
import { cn } from "../lib/utils";
import { Car, Truck, Bike, Package } from "lucide-react";
import type { ParkingSpot } from "../lib/mock-data";

interface ParkingSpotCardProps {
  spot: ParkingSpot;
  onClick?: () => void;
}

const vehicleIcons = {
  "سواری": Car,
  "وانت": Truck,
  "موتور": Bike,
  "کامیون": Package,
};

export function ParkingSpotCard({ spot, onClick }: ParkingSpotCardProps) {
  const statusColors = {
    available: "bg-success/10 border-success/30 hover:bg-success/20",
    occupied: "bg-destructive/10 border-destructive/30 hover:bg-destructive/20",
    reserved: "bg-warning/10 border-warning/30 hover:bg-warning/20",
    disabled: "bg-muted border-border hover:bg-muted",
  };

  const statusTextColors = {
    available: "text-success",
    occupied: "text-destructive",
    reserved: "text-warning",
    disabled: "text-muted-foreground",
  };

  const statusLabels = {
    available: "آزاد",
    occupied: "اشغال",
    reserved: "رزرو",
    disabled: "غیرفعال",
  };

  const VehicleIcon = spot.vehicleType ? vehicleIcons[spot.vehicleType as keyof typeof vehicleIcons] : Car;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all border-2",
        statusColors[spot.status]
      )}
      onClick={onClick}
    >
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <div className={cn("rounded-lg p-2", spot.status === "occupied" ? "bg-destructive/20" : "bg-background/50")}>
          <VehicleIcon className={cn("size-8", statusTextColors[spot.status])} />
        </div>
        <div>
          <p className="font-semibold">{spot.number}</p>
          <p className={cn("text-xs", statusTextColors[spot.status])}>
            {statusLabels[spot.status]}
          </p>
        </div>
        {spot.licensePlate && (
          <p className="text-xs text-muted-foreground truncate w-full">
            {spot.licensePlate.split(" ").slice(0, 3).join(" ")}
          </p>
        )}
      </div>
    </Card>
  );
}

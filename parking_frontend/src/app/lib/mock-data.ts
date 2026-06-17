import { generatePersianPlate } from "./utils";

export interface Vehicle {
  id: string;
  licensePlate: string;
  vehicleType: "سواری" | "وانت" | "موتور" | "کامیون";
  spotNumber: string;
  entryTime: Date;
  exitTime?: Date;
  operator: string;
  status: "active" | "exited";
  fee?: number;
}

export interface ParkingSpot {
  id: string;
  number: string;
  status: "available" | "occupied" | "reserved" | "disabled";
  vehicleType?: string;
  licensePlate?: string;
}

export interface User {
  id: string;
  name: string;
  role: "مدیر" | "اپراتور" | "کاربر";
  phone: string;
  status: "active" | "inactive";
  avatar: string;
  lastLogin: Date;
}

export interface Tariff {
  id: string;
  vehicleType: "سواری" | "وانت" | "موتور" | "کامیون";
  firstHourFee: number;
  additionalHourFee: number;
  dailyFee: number;
}

export interface Shift {
  id: string;
  operator: string;
  startTime: Date;
  endTime?: Date;
  revenue: number;
  vehiclesEntered: number;
  vehiclesExited: number;
  status: "active" | "completed";
}

// Mock data
export const mockVehicles: Vehicle[] = Array.from({ length: 15 }, (_, i) => ({
  id: `v-${i + 1}`,
  licensePlate: generatePersianPlate(),
  vehicleType: ["سواری", "وانت", "موتور", "کامیون"][Math.floor(Math.random() * 4)] as Vehicle["vehicleType"],
  spotNumber: `A-${i + 1}`,
  entryTime: new Date(Date.now() - Math.random() * 5 * 60 * 60 * 1000),
  operator: "علی احمدی",
  status: "active",
}));

export const mockParkingSpots: ParkingSpot[] = Array.from({ length: 50 }, (_, i) => {
  const isOccupied = i < 15;
  return {
    id: `spot-${i + 1}`,
    number: `${String.fromCharCode(65 + Math.floor(i / 10))}-${(i % 10) + 1}`,
    status: isOccupied ? "occupied" : Math.random() > 0.9 ? "disabled" : "available",
    vehicleType: isOccupied ? mockVehicles[i]?.vehicleType : undefined,
    licensePlate: isOccupied ? mockVehicles[i]?.licensePlate : undefined,
  };
});

export const mockUsers: User[] = [
  {
    id: "u-1",
    name: "علی احمدی",
    role: "مدیر",
    phone: "09121234567",
    status: "active",
    avatar: "AA",
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "u-2",
    name: "مریم رضایی",
    role: "اپراتور",
    phone: "09127654321",
    status: "active",
    avatar: "MR",
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: "u-3",
    name: "حسین کریمی",
    role: "اپراتور",
    phone: "09139876543",
    status: "active",
    avatar: "HK",
    lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "u-4",
    name: "فاطمه محمدی",
    role: "کاربر",
    phone: "09151234567",
    status: "inactive",
    avatar: "FM",
    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

export const mockTariffs: Tariff[] = [
  {
    id: "t-1",
    vehicleType: "سواری",
    firstHourFee: 50000,
    additionalHourFee: 30000,
    dailyFee: 400000,
  },
  {
    id: "t-2",
    vehicleType: "وانت",
    firstHourFee: 70000,
    additionalHourFee: 40000,
    dailyFee: 550000,
  },
  {
    id: "t-3",
    vehicleType: "موتور",
    firstHourFee: 30000,
    additionalHourFee: 20000,
    dailyFee: 250000,
  },
  {
    id: "t-4",
    vehicleType: "کامیون",
    firstHourFee: 100000,
    additionalHourFee: 60000,
    dailyFee: 800000,
  },
];

export const mockShifts: Shift[] = [
  {
    id: "s-1",
    operator: "مریم رضایی",
    startTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    endTime: undefined,
    revenue: 2450000,
    vehiclesEntered: 45,
    vehiclesExited: 38,
    status: "active",
  },
  {
    id: "s-2",
    operator: "حسین کریمی",
    startTime: new Date(Date.now() - 16 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 8 * 60 * 60 * 1000),
    revenue: 3200000,
    vehiclesEntered: 52,
    vehiclesExited: 52,
    status: "completed",
  },
];

export function calculateParkingFee(vehicleType: Vehicle["vehicleType"], durationMinutes: number): number {
  const tariff = mockTariffs.find((t) => t.vehicleType === vehicleType);
  if (!tariff) return 0;

  const hours = Math.ceil(durationMinutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days * tariff.dailyFee;
  }

  if (hours <= 1) {
    return tariff.firstHourFee;
  }

  return tariff.firstHourFee + (hours - 1) * tariff.additionalHourFee;
}

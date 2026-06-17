import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fa-IR", {
    style: "currency",
    currency: "IRR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} دقیقه`;
  }

  return `${hours} ساعت و ${mins} دقیقه`;
}

export function formatPersianDate(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function generatePersianPlate(): string {
  const iranNumber = Math.floor(Math.random() * 100);
  const letter = ["الف", "ب", "پ", "ت", "ج", "د", "ز", "س", "ص", "ع", "ق", "ل", "م", "ن", "و", "ه", "ی"][Math.floor(Math.random() * 17)];
  const threeDigits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const twoDigits = String(Math.floor(Math.random() * 100)).padStart(2, "0");

  return `${iranNumber} ${letter} ${threeDigits} ایران ${twoDigits}`;
}

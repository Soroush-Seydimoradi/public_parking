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

// الگوی کامل پلاک ایرانی: XX حرف YYY ایران ZZ
const PLATE_PATTERN = /^(\d{2})\s+([\u0600-\u06FF]+)\s+(\d{3})\s+ایران\s+(\d{2})$/;

const MIN_PREFIX = 11;
const MIN_MIDDLE = 111;
const MIN_SUFFIX = 10;

/**
 * اعتبارسنجی فرمت و محدوده مجاز پلاک فارسی.
 * در صورت معتبر نبودن، پیام خطا برمی‌گرداند؛ در غیر این صورت null.
 */
export function validatePersianPlate(plate: string): string | null {
  const trimmed = plate.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return "پلاک خودرو الزامی است.";
  }

  const match = trimmed.match(PLATE_PATTERN);
  if (!match) {
    return "فرمت پلاک نامعتبر است. مثال صحیح: 12 الف 345 ایران 67";
  }

  const [, prefix, , middle, suffix] = match;

  if (Number(prefix) < MIN_PREFIX) {
    return `دو رقم اول پلاک نمی‌تواند کمتر از ${MIN_PREFIX} باشد.`;
  }

  if (Number(middle) < MIN_MIDDLE) {
    return `سه رقم وسط پلاک نمی‌تواند کمتر از ${MIN_MIDDLE} باشد.`;
  }

  if (Number(suffix) < MIN_SUFFIX) {
    return `دو رقم شناسه ایران نمی‌تواند کمتر از ${MIN_SUFFIX} باشد.`;
  }

  return null;
}
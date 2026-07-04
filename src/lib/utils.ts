import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// "YYYY-MM" in the local timezone. Deliberately avoids `toISOString`, which
// converts to UTC first and rolls back to the previous month for anyone in a
// positive UTC offset (e.g. WIB) during the first ~7 hours of the day.
export function getYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

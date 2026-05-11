import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value || 0);
}

/**
 * Safely converts any value to a number.
 * Returns 0 if the value is null, undefined, NaN, or non-numeric.
 */
export function toSafeNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}
/**
 * Formats a quantity for display, stripping trailing zeros for decimals.
 * Example: 8.000 -> "8", 8.500 -> "8.5", 8.1234 -> "8.1234"
 */
export function formatQuantity(value: any, unit?: string): string {
  const num = toSafeNumber(value);
  if (unit && (unit.toLowerCase() === 'kilogram' || unit.toLowerCase() === 'kg')) {
    return parseFloat(num.toFixed(3)).toString();
  }
  return Math.round(num).toString();
}

/**
 * Formats a stock quantity for display in inventory tables.
 * Rounds up to the nearest whole number to handle parent-child unit conversions
 * and avoid displaying decimal points for discrete items.
 * Example: 9.9167 -> "10"
 */
export function formatStockQuantity(value: any, unit?: string): string {
  const num = toSafeNumber(value);
  if (unit && (unit.toLowerCase() === 'kilogram' || unit.toLowerCase() === 'kg')) {
    return parseFloat(num.toFixed(3)).toString();
  }
  return Math.ceil(num).toString();
}

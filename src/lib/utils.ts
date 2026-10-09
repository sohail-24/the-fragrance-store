import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeFrontendMobileNumber(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.length === 10 ? `+91${digits}` : (digits.startsWith("91") ? `+${digits}` : `+91${digits}`);
  return normalized;
}

export function normalizeUSPhoneNumber(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("1") && digits.length === 11) {
    return `+${digits}`;
  }
  return `+1${digits.slice(-10)}`;
}

export function isValidUSPhoneNumber(input: string) {
  if (!input) return false;
  const digits = input.replace(/\D/g, "");
  const normalizedDigits = digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
  return normalizedDigits.length === 10 && /^[2-9]\d{9}$/.test(normalizedDigits);
}

export function isValidIndianMobileNumber(input: string) {
  if (!input) return false;
  if (isValidUSPhoneNumber(input)) return true;
  const normalized = normalizeFrontendMobileNumber(input);
  return /^\+91[6-9]\d{9}$/.test(normalized);
}

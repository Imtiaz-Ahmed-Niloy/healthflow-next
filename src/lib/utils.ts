import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "Tk"): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount).toFixed(2);
  const prefix = currency === "$" ? "$" : currency.endsWith(" ") ? currency : `${currency} `;
  return `${isNegative ? "-" : ""}${prefix}${absAmount}`;
}

export function formatDateTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateTime(date: Date | string) {
  return `${formatDate(date)} ${formatTime(date)}`
}

export function generateOrderNumber() {
  return Math.floor(1000 + Math.random() * 9000)
}

export function getElapsedTime(startTime: Date | string): string {
  const start = new Date(startTime).getTime()
  const now = Date.now()
  const diffMs = now - start
  const minutes = Math.floor(diffMs / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

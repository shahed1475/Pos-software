"use client"

import { cn } from "@/lib/utils"
import { Users } from "lucide-react"

interface TableCardProps {
  table: {
    id: string
    number: number
    capacity: number
    status: string
    orders?: any[]
  }
  onClick?: () => void
  selected?: boolean
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300",
  OCCUPIED: "bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300",
  RESERVED: "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300",
  MAINTENANCE: "bg-gray-100 dark:bg-gray-800/40 border-gray-400 dark:border-gray-600 text-gray-800 dark:text-gray-300",
}

export function TableCard({ table, onClick, selected }: TableCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all hover:shadow-md min-w-[120px] min-h-[120px]",
        statusColors[table.status] || statusColors.AVAILABLE,
        selected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <span className="text-2xl font-bold">T{table.number}</span>
      <div className="flex items-center gap-1 mt-2 text-sm">
        <Users className="h-3 w-3" />
        <span>{table.capacity}</span>
      </div>
      <span className="mt-1 text-xs font-medium uppercase">
        {table.status.replace("_", " ")}
      </span>
      {table.orders && table.orders.length > 0 && (
        <span className="mt-1 text-xs">
          {table.orders.length} order{table.orders.length > 1 ? "s" : ""}
        </span>
      )}
    </button>
  )
}

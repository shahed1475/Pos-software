"use client"

import { TableCard } from "./TableCard"

interface TableGridProps {
  tables: any[]
  onTableClick?: (table: any) => void
  selectedTableId?: string | null
}

export function TableGrid({ tables, onTableClick, selectedTableId }: TableGridProps) {
  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No tables configured
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          onClick={() => onTableClick?.(table)}
          selected={table.id === selectedTableId}
        />
      ))}
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface ReorderSuggestion {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  avgDailyUsage: number
  daysUntilStockout: number
  urgency: "CRITICAL" | "LOW" | "OK"
  suggestedReorderQty: number
  estimatedCost: number
}

interface ReorderTableProps {
  data: ReorderSuggestion[]
}

const URGENCY_STYLES = {
  CRITICAL: "destructive" as const,
  LOW: "secondary" as const,
  OK: "outline" as const,
}

export function ReorderTable({ data }: ReorderTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No inventory data available for reorder suggestions.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ingredient</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Avg Usage/Day</TableHead>
            <TableHead className="text-right">Days Left</TableHead>
            <TableHead className="text-right">Reorder Qty</TableHead>
            <TableHead className="text-right">Est. Cost</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.ingredientId}>
              <TableCell className="font-medium">{item.ingredientName}</TableCell>
              <TableCell className="text-right">{item.currentStock} {item.unit}</TableCell>
              <TableCell className="text-right">{item.avgDailyUsage} {item.unit}</TableCell>
              <TableCell className="text-right">{item.daysUntilStockout === 999 ? "N/A" : item.daysUntilStockout}</TableCell>
              <TableCell className="text-right">{item.suggestedReorderQty > 0 ? `${item.suggestedReorderQty} ${item.unit}` : "-"}</TableCell>
              <TableCell className="text-right">{item.estimatedCost > 0 ? formatCurrency(item.estimatedCost) : "-"}</TableCell>
              <TableCell>
                <Badge variant={URGENCY_STYLES[item.urgency]}>{item.urgency}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

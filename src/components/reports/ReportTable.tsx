"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

interface ReportTableProps {
  title: string
  data: { name: string; quantity?: number; revenue: number; orders?: number }[]
  columns?: string[]
}

export function ReportTable({ title, data, columns }: ReportTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">No data available</div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>{columns?.[0] || "Name"}</TableHead>
          {data[0].quantity !== undefined && (
            <TableHead className="text-right">{columns?.[1] || "Quantity"}</TableHead>
          )}
          <TableHead className="text-right">{columns?.[2] || "Revenue"}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={item.name}>
            <TableCell>{index + 1}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            {item.quantity !== undefined && (
              <TableCell className="text-right">{item.quantity}</TableCell>
            )}
            <TableCell className="text-right font-semibold">{formatCurrency(item.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

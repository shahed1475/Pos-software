"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Edit, ShoppingCart, AlertTriangle } from "lucide-react"

interface StockTableProps {
  ingredients: any[]
  onEdit: (ingredient: any) => void
  onPurchase: (ingredient: any) => void
}

export function StockTable({ ingredients, onEdit, onPurchase }: StockTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead className="text-right">Min Stock</TableHead>
          <TableHead className="text-right">Cost/Unit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ing) => {
          const isLow = ing.stock <= ing.minStock
          return (
            <TableRow key={ing.id} className={isLow ? "bg-red-50 dark:bg-red-950/30" : ""}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {isLow && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {ing.name}
                </div>
              </TableCell>
              <TableCell>{ing.unit}</TableCell>
              <TableCell className="text-right font-mono">{ing.stock.toFixed(1)}</TableCell>
              <TableCell className="text-right font-mono">{ing.minStock.toFixed(1)}</TableCell>
              <TableCell className="text-right">{formatCurrency(ing.costPerUnit)}</TableCell>
              <TableCell>
                <Badge variant={isLow ? "destructive" : "success"}>
                  {isLow ? "Low Stock" : "OK"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(ing)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onPurchase(ing)}>
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

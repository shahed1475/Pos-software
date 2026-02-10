"use client"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Minus, Plus, Trash2 } from "lucide-react"

interface OrderItemRowProps {
  item: {
    menuItemId: string
    name: string
    price: number
    quantity: number
    variant?: string
    variantPriceAdj?: number
    notes?: string
  }
  onIncrement: () => void
  onDecrement: () => void
  onRemove: () => void
}

export function OrderItemRow({ item, onIncrement, onDecrement, onRemove }: OrderItemRowProps) {
  const itemPrice = item.price + (item.variantPriceAdj || 0)
  const lineTotal = itemPrice * item.quantity

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex-1 min-w-0 mr-2">
        <p className="text-sm font-medium truncate">
          {item.name}
          {item.variant && (
            <span className="text-muted-foreground text-xs ml-1">({item.variant})</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{formatCurrency(itemPrice)} each</p>
        {item.notes && <p className="text-xs text-orange-600">Note: {item.notes}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onDecrement}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={onIncrement}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <span className="w-16 text-right text-sm font-semibold">{formatCurrency(lineTotal)}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

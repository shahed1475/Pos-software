"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { OrderItemRow } from "./OrderItemRow"
import { formatCurrency } from "@/lib/utils"
import { ShoppingCart, Trash2 } from "lucide-react"
import type { CartItem } from "@/types"

interface OrderFormProps {
  items: CartItem[]
  subtotal: number
  taxAmount: number
  discount: number
  total: number
  onIncrement: (menuItemId: string) => void
  onDecrement: (menuItemId: string) => void
  onRemove: (menuItemId: string) => void
  onClear: () => void
  onPay: () => void
  onHold?: () => void
}

export function OrderForm({
  items,
  subtotal,
  taxAmount,
  discount,
  total,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPay,
  onHold,
}: OrderFormProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Current Order
          </CardTitle>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={onClear}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-2 opacity-30" />
            <p>No items added</p>
            <p className="text-xs">Tap menu items to add them</p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <OrderItemRow
                key={item.menuItemId + (item.variant || "")}
                item={item}
                onIncrement={() => onIncrement(item.menuItemId)}
                onDecrement={() => onDecrement(item.menuItemId)}
                onRemove={() => onRemove(item.menuItemId)}
              />
            ))}
          </div>
        )}
      </CardContent>
      {items.length > 0 && (
        <div className="border-t p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {onHold && (
              <Button variant="outline" onClick={onHold}>Hold</Button>
            )}
            <Button className={onHold ? "" : "col-span-2"} onClick={onPay}>
              Pay {formatCurrency(total)}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KitchenTimer } from "./KitchenTimer"
import { CheckCircle, Circle } from "lucide-react"

interface KitchenOrderCardProps {
  order: any
  onMarkReady: (orderId: string) => void
  onToggleItem: (orderId: string, itemId: string, status: string) => void
}

const typeColors: Record<string, string> = {
  DINE_IN: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  TAKEAWAY: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
  DELIVERY: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300",
}

const typeLabels: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
}

export function KitchenOrderCard({ order, onMarkReady, onToggleItem }: KitchenOrderCardProps) {
  const allReady = order.items.every(
    (item: any) => item.status === "READY" || item.status === "SERVED" || item.status === "CANCELLED"
  )

  return (
    <Card className={`${allReady ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/30" : ""}`}>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold">#{order.orderNumber}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[order.type]}`}>
                {typeLabels[order.type]}
              </span>
              {order.table && (
                <span className="text-sm text-muted-foreground">Table {order.table.number}</span>
              )}
            </div>
          </div>
          <KitchenTimer startTime={order.createdAt} />
        </div>
        {order.customerName && (
          <p className="text-sm text-muted-foreground mt-1">{order.customerName}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2 mb-4">
          {order.items.map((item: any) => (
            <button
              key={item.id}
              onClick={() =>
                onToggleItem(
                  order.id,
                  item.id,
                  item.status === "READY" ? "PENDING" : "READY"
                )
              }
              className="flex items-center gap-2 w-full text-left rounded-md p-2 hover:bg-muted transition-colors"
            >
              {item.status === "READY" || item.status === "SERVED" ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium ${
                    item.status === "READY" || item.status === "SERVED"
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {item.quantity}x {item.menuItem?.name}
                </span>
                {item.variant && (
                  <span className="text-xs text-muted-foreground ml-1">({item.variant})</span>
                )}
                {item.notes && (
                  <p className="text-xs text-orange-600">{item.notes}</p>
                )}
              </div>
            </button>
          ))}
        </div>
        {order.notes && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mb-3 bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
            Note: {order.notes}
          </p>
        )}
        <Button
          className="w-full"
          variant={allReady ? "default" : "outline"}
          onClick={() => onMarkReady(order.id)}
        >
          {allReady ? "Order Ready" : "Mark All Ready"}
        </Button>
      </CardContent>
    </Card>
  )
}

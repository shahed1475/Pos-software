"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatTime } from "@/lib/utils"
import { Clock, MapPin, Phone, User } from "lucide-react"

interface OrderCardProps {
  order: any
  onStatusChange?: (orderId: string, status: string) => void
  onClick?: () => void
}

const statusColors: Record<string, any> = {
  NEW: "default",
  PREPARING: "warning",
  READY: "success",
  SERVED: "secondary",
  COMPLETED: "success",
  CANCELLED: "destructive",
}

const typeLabels: Record<string, string> = {
  DINE_IN: "Dine In",
  TAKEAWAY: "Takeaway",
  DELIVERY: "Delivery",
}

export function OrderCard({ order, onStatusChange, onClick }: OrderCardProps) {
  const nextStatus: Record<string, string> = {
    NEW: "PREPARING",
    PREPARING: "READY",
    READY: "SERVED",
    SERVED: "COMPLETED",
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">#{order.orderNumber}</span>
              <Badge variant={statusColors[order.status]}>{order.status}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{typeLabels[order.type]}</span>
              {order.table && <span>- Table {order.table.number}</span>}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(order.createdAt)}
              </span>
            </div>
          </div>
          <span className="font-bold text-lg">{formatCurrency(order.total)}</span>
        </div>

        {(order.customerName || order.customerPhone) && (
          <div className="flex items-center gap-3 mb-2 text-sm text-muted-foreground">
            {order.customerName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {order.customerName}
              </span>
            )}
            {order.customerPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {order.customerPhone}
              </span>
            )}
          </div>
        )}

        <div className="space-y-1 mb-3">
          {order.items?.slice(0, 3).map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.menuItem?.name || "Item"}
                {item.variant && <span className="text-muted-foreground"> ({item.variant})</span>}
              </span>
              <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          {order.items?.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{order.items.length - 3} more items
            </p>
          )}
        </div>

        {onStatusChange && nextStatus[order.status] && (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              onStatusChange(order.id, nextStatus[order.status])
            }}
          >
            Mark as {nextStatus[order.status]}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

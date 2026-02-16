"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle, Clock, RefreshCw } from "lucide-react"

export default function PickupPage() {
  const [readyOrders, setReadyOrders] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchReady()
    const interval = setInterval(fetchReady, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchReady() {
    const res = await fetch("/api/orders?status=READY")
    if (res.ok) setReadyOrders(await res.json())
  }

  async function confirmPickup(orderId: string) {
    const res = await fetch(`/api/orders/${orderId}/pickup`, { method: "POST" })
    if (res.ok) {
      toast({ title: "Pickup confirmed" })
      fetchReady()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pickup Screen</h1>
          <p className="text-muted-foreground">Orders ready for pickup</p>
        </div>
        <Button variant="outline" onClick={fetchReady}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {readyOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Clock className="h-12 w-12 mb-4" />
          <p className="text-lg">No orders ready for pickup</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {readyOrders.map((order) => (
            <Card key={order.id} className="border-2 border-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-3xl font-mono font-bold">
                      {order.pickupCode || `#${order.orderNumber || order.id.slice(-4)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName || "Guest"}
                    </p>
                  </div>
                  <Badge className="bg-green-500 text-white">READY</Badge>
                </div>

                <div className="space-y-1 mb-4">
                  {order.items?.map((item: any) => (
                    <p key={item.id} className="text-sm">
                      {item.quantity}x {item.menuItem?.name}
                    </p>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold">${order.total.toFixed(2)}</span>
                  <Button onClick={() => confirmPickup(order.id)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" /> Picked Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

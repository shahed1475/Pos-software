"use client"

import { useEffect, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KitchenOrderCard } from "@/components/kitchen/KitchenOrderCard"
import { useToast } from "@/components/ui/use-toast"
import { RefreshCw, Volume2, VolumeX } from "lucide-react"

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const previousCountRef = useRef(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders?status=active")
      if (res.ok) {
        const data = await res.json()
        // Filter for kitchen-relevant orders (NEW and PREPARING)
        const kitchenOrders = data.filter(
          (o: any) => o.status === "NEW" || o.status === "PREPARING"
        )

        // Play sound for new orders
        if (soundEnabled && kitchenOrders.length > previousCountRef.current) {
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgip6teleagoKGm62si2pTUXmQn5J4XlBfepWdlYFoUUtld5Gaj3lgVVhrf5KYkHthVFljd4+Wj3liVVpje4+WjnhhVFdid4+WkHliVFpkfJCXj3phVFtjfJCYkHphU1xkfJCYkHpgU1xjfJCXj3pgU1tkfJCYkHpgVFxkfI+Yj3lgVFtkfJCXkHphVFxjfJCXj3phVFtjfJCXj3pgU1xjfJCXj3pgU1tkfJCXkHphVFxkfJCYkHphVFxkfJCXj3pgU1tkfI+Xj3lgU1xjfJCXj3phU1xjfJCXkHphVFxkfJCYkHphVFxkfI+Xj3pgU1tkfJCXkHphVFxjfJCXj3pgU1xjfI+Xj3pgU1tkfJCXj3phVFxjfI+XkHphVFxkfJCYkHphVFtk")
            audio.play().catch(() => {})
          } catch {}
        }
        previousCountRef.current = kitchenOrders.length
        setOrders(kitchenOrders)
      }
    } catch (error) {
      console.error("Failed to fetch kitchen orders:", error)
    }
  }

  async function handleMarkReady(orderId: string) {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "READY" }),
      })
      toast({ title: "Order marked as ready!" })
      fetchOrders()
    } catch {
      toast({ title: "Failed to update order", variant: "destructive" })
    }
  }

  async function handleToggleItem(orderId: string, itemId: string, status: string) {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemUpdates: [{ id: itemId, status }],
        }),
      })
      fetchOrders()
    } catch {
      toast({ title: "Failed to update item", variant: "destructive" })
    }
  }

  const newOrders = orders.filter((o) => o.status === "NEW")
  const preparingOrders = orders.filter((o) => o.status === "PREPARING")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kitchen Display</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="default">{newOrders.length} New</Badge>
            <Badge variant="warning">{preparingOrders.length} Preparing</Badge>
            <span className="text-sm text-muted-foreground">Auto-refreshes every 5s</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="text-6xl mb-4">👨‍🍳</span>
          <p className="text-xl font-medium">No orders in the kitchen</p>
          <p className="text-sm">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              onMarkReady={handleMarkReady}
              onToggleItem={handleToggleItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}

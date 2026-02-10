"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrderCard } from "@/components/orders/OrderCard"
import { useToast } from "@/components/ui/use-toast"
import { Plus, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("active")
  const [typeFilter, setTypeFilter] = useState("all")
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [statusFilter, typeFilter])

  async function fetchOrders() {
    const params = new URLSearchParams()
    if (statusFilter !== "all") params.set("status", statusFilter)
    if (typeFilter !== "all") params.set("type", typeFilter)
    const res = await fetch(`/api/orders?${params}`)
    if (res.ok) setOrders(await res.json())
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      toast({ title: `Order updated to ${status}` })
      fetchOrders()
    } catch {
      toast({ title: "Failed to update order", variant: "destructive" })
    }
  }

  const statusCounts = {
    NEW: orders.filter((o) => o.status === "NEW").length,
    PREPARING: orders.filter((o) => o.status === "PREPARING").length,
    READY: orders.filter((o) => o.status === "READY").length,
    SERVED: orders.filter((o) => o.status === "SERVED").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage active and past orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/dashboard/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex gap-2">
          {[
            { value: "active", label: "Active" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "all", label: "All" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="DINE_IN">Dine In</SelectItem>
            <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
            <SelectItem value="DELIVERY">Delivery</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {statusFilter === "active" && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.NEW}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{statusCounts.PREPARING}</p>
              <p className="text-xs text-muted-foreground">Preparing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.READY}</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{statusCounts.SERVED}</p>
              <p className="text-xs text-muted-foreground">Served</p>
            </CardContent>
          </Card>
        </div>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No orders found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

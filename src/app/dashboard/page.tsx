"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  ShoppingCart,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface DashboardStats {
  todayRevenue: number
  todayOrders: number
  activeOrders: number
  avgOrderValue: number
  tablesOccupied: number
  totalTables: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrders: 0,
    activeOrders: 0,
    avgOrderValue: 0,
    tablesOccupied: 0,
    totalTables: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
    fetchRecentOrders()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch("/api/reports?type=dashboard")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  async function fetchRecentOrders() {
    try {
      const res = await fetch("/api/orders?limit=5")
      if (res.ok) {
        const data = await res.json()
        setRecentOrders(data)
      }
    } catch (error) {
      console.error("Failed to fetch recent orders:", error)
    }
  }

  const statCards = [
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Active Orders",
      value: stats.activeOrders.toString(),
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(stats.avgOrderValue),
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Tables Occupied",
      value: `${stats.tablesOccupied}/${stats.totalTables}`,
      icon: UtensilsCrossed,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-100 dark:bg-rose-900/30",
    },
    {
      title: "Staff On Duty",
      value: "-",
      icon: Users,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-100 dark:bg-teal-900/30",
    },
  ]

  const statusColor: Record<string, string> = {
    NEW: "default",
    PREPARING: "warning",
    READY: "success",
    SERVED: "secondary",
    COMPLETED: "success",
    CANCELLED: "destructive",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your restaurant</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-full p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No orders yet. Start by creating a new order!
            </p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">Order #{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.type.replace("_", " ")} {order.table ? `- Table ${order.table.number}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={statusColor[order.status] as any}>
                      {order.status}
                    </Badge>
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const startDate = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0))
    const endDate = to ? new Date(to) : new Date()

    const tenantFilter: any = {}
    if (session.tenantId) tenantFilter.tenantId = session.tenantId
    if (session.branchId) tenantFilter.branchId = session.branchId

    if (type === "dashboard") {
      // Dashboard stats - all roles with orders:read can see
      if (!requirePermission(session.role, "orders:read")) return forbiddenResponse()

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const todayOrders = await prisma.order.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
      })

      const todayRevenue = todayOrders
        .filter((o) => o.status === "COMPLETED")
        .reduce((sum, o) => sum + o.total, 0)

      const activeOrders = await prisma.order.count({
        where: {
          ...tenantFilter,
          status: { in: ["NEW", "PREPARING", "READY", "SERVED"] },
        },
      })

      const tables = await prisma.table.findMany({
        where: session.branchId ? { branchId: session.branchId } : (session.tenantId ? { tenantId: session.tenantId } : {}),
      })
      const tablesOccupied = tables.filter((t) => t.status === "OCCUPIED").length

      return NextResponse.json({
        todayRevenue,
        todayOrders: todayOrders.length,
        activeOrders,
        avgOrderValue: todayOrders.length > 0 ? todayRevenue / todayOrders.filter((o) => o.status === "COMPLETED").length || 0 : 0,
        tablesOccupied,
        totalTables: tables.length,
      })
    }

    // All other report types require reports:read
    if (!requirePermission(session.role, "reports:read")) return forbiddenResponse()

    if (type === "hourly") {
      // Revenue by hour
      const orders = await prisma.order.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
      })

      const hourlyMap = new Map<number, { hour: number; revenue: number; orders: number }>()
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { hour: i, revenue: 0, orders: 0 })
      }

      orders.forEach((order) => {
        const hour = order.createdAt.getHours()
        const existing = hourlyMap.get(hour)!
        existing.revenue += order.total
        existing.orders += 1
      })

      return NextResponse.json({
        hourlyData: Array.from(hourlyMap.values()),
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        totalOrders: orders.length,
      })
    }

    if (type === "staff") {
      // Revenue by staff
      const orders = await prisma.order.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
        include: {
          staff: { select: { id: true, name: true, role: true } },
        },
      })

      const staffMap = new Map<string, { name: string; role: string; revenue: number; orders: number; avgOrder: number }>()
      orders.forEach((order) => {
        const key = order.staffId
        const existing = staffMap.get(key) || {
          name: order.staff.name,
          role: order.staff.role,
          revenue: 0,
          orders: 0,
          avgOrder: 0,
        }
        existing.revenue += order.total
        existing.orders += 1
        existing.avgOrder = existing.revenue / existing.orders
        staffMap.set(key, existing)
      })

      return NextResponse.json({
        staffData: Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue),
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        totalOrders: orders.length,
      })
    }

    if (type === "pnl") {
      // Profit & Loss
      const orders = await prisma.order.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
        include: {
          items: {
            include: {
              menuItem: {
                include: {
                  ingredients: { include: { ingredient: true } },
                },
              },
            },
          },
        },
      })

      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
      const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0)

      // Calculate COGS from recipes
      let totalCOGS = 0
      orders.forEach((order) => {
        order.items.forEach((item) => {
          item.menuItem.ingredients.forEach((ing) => {
            totalCOGS += ing.quantity * item.quantity * ing.ingredient.costPerUnit
          })
        })
      })

      // Get expenses
      let totalExpenses = 0
      try {
        const expenses = await (prisma as any).expense?.findMany?.({
          where: {
            ...(session.tenantId && { tenantId: session.tenantId }),
            ...(session.branchId && { branchId: session.branchId }),
            date: { gte: startDate, lte: endDate },
          },
        })
        if (expenses) {
          totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
        }
      } catch {
        // Expense model may not exist yet
      }

      const grossProfit = totalRevenue - totalTax - totalCOGS
      const netProfit = grossProfit - totalExpenses

      return NextResponse.json({
        totalRevenue,
        totalTax,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        totalOrders: orders.length,
        margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      })
    }

    if (type === "sales") {
      // Sales report
      const orders = await prisma.order.findMany({
        where: {
          ...tenantFilter,
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
        include: {
          items: { include: { menuItem: { include: { category: true } } } },
          payments: true,
        },
        orderBy: { createdAt: "asc" },
      })

      const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
      const totalTax = orders.reduce((sum, o) => sum + o.taxAmount, 0)
      const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0)

      // Daily breakdown
      const dailyMap = new Map<string, { date: string; revenue: number; orders: number }>()
      orders.forEach((order) => {
        const date = order.createdAt.toISOString().split("T")[0]
        const existing = dailyMap.get(date) || { date, revenue: 0, orders: 0 }
        existing.revenue += order.total
        existing.orders += 1
        dailyMap.set(date, existing)
      })

      // Payment methods breakdown
      const paymentBreakdown: Record<string, number> = {}
      orders.forEach((order) => {
        order.payments.forEach((p) => {
          paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount
        })
      })

      // Top items
      const itemSales = new Map<string, { name: string; quantity: number; revenue: number }>()
      orders.forEach((order) => {
        order.items.forEach((item) => {
          const key = item.menuItemId
          const existing = itemSales.get(key) || {
            name: item.menuItem?.name || "Unknown",
            quantity: 0,
            revenue: 0,
          }
          existing.quantity += item.quantity
          existing.revenue += item.unitPrice * item.quantity
          itemSales.set(key, existing)
        })
      })

      const topItems = Array.from(itemSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Category breakdown
      const categoryBreakdown = new Map<string, { name: string; revenue: number; orders: number }>()
      orders.forEach((order) => {
        order.items.forEach((item) => {
          const catName = item.menuItem?.category?.name || "Uncategorized"
          const existing = categoryBreakdown.get(catName) || { name: catName, revenue: 0, orders: 0 }
          existing.revenue += item.unitPrice * item.quantity
          existing.orders += 1
          categoryBreakdown.set(catName, existing)
        })
      })

      return NextResponse.json({
        totalRevenue,
        totalOrders: orders.length,
        totalTax,
        totalDiscount,
        avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        dailyData: Array.from(dailyMap.values()),
        paymentBreakdown,
        topItems,
        categoryBreakdown: Array.from(categoryBreakdown.values()),
      })
    }

    // Default: return basic stats
    const totalOrders = await prisma.order.count({
      where: { ...tenantFilter, createdAt: { gte: startDate, lte: endDate } },
    })
    const completedOrders = await prisma.order.findMany({
      where: {
        ...tenantFilter,
        createdAt: { gte: startDate, lte: endDate },
        status: "COMPLETED",
      },
    })
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)

    return NextResponse.json({
      totalOrders,
      completedOrders: completedOrders.length,
      totalRevenue,
    })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}

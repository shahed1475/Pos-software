import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "reports:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // daily, hourly, inventory
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    if (!type || !from || !to) {
      return NextResponse.json({ error: "Missing type, from, or to params" }, { status: 400 })
    }

    const tenantId = session.tenantId
    const branchId = session.branchId

    if (type === "daily") {
      const summaries = await prisma.dailySalesSummary.findMany({
        where: {
          tenantId,
          branchId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: "asc" },
      })

      if (summaries.length > 0) {
        const totals = summaries.reduce(
          (acc, s) => ({
            totalOrders: acc.totalOrders + s.totalOrders,
            completedOrders: acc.completedOrders + s.completedOrders,
            cancelledOrders: acc.cancelledOrders + s.cancelledOrders,
            totalRevenue: acc.totalRevenue + s.totalRevenue,
            totalTax: acc.totalTax + s.totalTax,
            totalDiscount: acc.totalDiscount + s.totalDiscount,
            totalCOGS: acc.totalCOGS + s.totalCOGS,
            totalExpenses: acc.totalExpenses + s.totalExpenses,
            netProfit: acc.netProfit + s.netProfit,
          }),
          {
            totalOrders: 0, completedOrders: 0, cancelledOrders: 0,
            totalRevenue: 0, totalTax: 0, totalDiscount: 0,
            totalCOGS: 0, totalExpenses: 0, netProfit: 0,
          }
        )

        return NextResponse.json({
          summaries: summaries.map((s) => ({
            ...s,
            topItems: s.topItemsJson ? JSON.parse(s.topItemsJson) : [],
            paymentMethods: s.paymentMethodsJson ? JSON.parse(s.paymentMethodsJson) : {},
          })),
          totals: {
            ...totals,
            avgOrderValue: totals.completedOrders > 0 ? totals.totalRevenue / totals.completedOrders : 0,
          },
          source: "aggregated" as const,
        })
      }

      // Fallback: live calculation
      return await liveDailySummary(tenantId, branchId, from, to)
    }

    if (type === "hourly") {
      const summaries = await prisma.hourlySalesSummary.findMany({
        where: {
          tenantId,
          branchId,
          date: { gte: from, lte: to },
        },
        orderBy: [{ date: "asc" }, { hour: "asc" }],
      })

      if (summaries.length > 0) {
        return NextResponse.json({ summaries, source: "aggregated" as const })
      }

      // Fallback: live calculation
      return await liveHourlySummary(tenantId, branchId, from, to)
    }

    if (type === "inventory") {
      const summaries = await prisma.inventorySummary.findMany({
        where: {
          tenantId,
          branchId,
          date: { gte: from, lte: to },
        },
        orderBy: [{ date: "asc" }, { ingredientName: "asc" }],
      })

      if (summaries.length > 0) {
        return NextResponse.json({ summaries, source: "aggregated" as const })
      }

      // Fallback: no live inventory summary (too complex without logs)
      return NextResponse.json({ summaries: [], source: "live" as const })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("Summary error:", error)
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 })
  }
}

async function liveDailySummary(tenantId: string, branchId: string, from: string, to: string) {
  const startDate = new Date(from + "T00:00:00.000Z")
  const endDate = new Date(to + "T23:59:59.999Z")

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      branchId,
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { payments: true },
  })

  const byDate = new Map<string, { date: string; totalOrders: number; completedOrders: number; cancelledOrders: number; totalRevenue: number; totalTax: number; totalDiscount: number; avgOrderValue: number }>()

  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0]
    const existing = byDate.get(date) || {
      date, totalOrders: 0, completedOrders: 0, cancelledOrders: 0,
      totalRevenue: 0, totalTax: 0, totalDiscount: 0, avgOrderValue: 0,
    }
    existing.totalOrders++
    if (order.status === "COMPLETED") {
      existing.completedOrders++
      existing.totalRevenue += order.total
      existing.totalTax += order.taxAmount
      existing.totalDiscount += order.discount
    }
    if (order.status === "CANCELLED") existing.cancelledOrders++
    existing.avgOrderValue = existing.completedOrders > 0 ? existing.totalRevenue / existing.completedOrders : 0
    byDate.set(date, existing)
  }

  const summaries = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  const totals = summaries.reduce(
    (acc, s) => ({
      totalOrders: acc.totalOrders + s.totalOrders,
      completedOrders: acc.completedOrders + s.completedOrders,
      totalRevenue: acc.totalRevenue + s.totalRevenue,
      totalTax: acc.totalTax + s.totalTax,
      totalDiscount: acc.totalDiscount + s.totalDiscount,
    }),
    { totalOrders: 0, completedOrders: 0, totalRevenue: 0, totalTax: 0, totalDiscount: 0 }
  )

  return NextResponse.json({
    summaries,
    totals: {
      ...totals,
      avgOrderValue: totals.completedOrders > 0 ? totals.totalRevenue / totals.completedOrders : 0,
    },
    source: "live" as const,
  })
}

async function liveHourlySummary(tenantId: string, branchId: string, from: string, to: string) {
  const startDate = new Date(from + "T00:00:00.000Z")
  const endDate = new Date(to + "T23:59:59.999Z")

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      branchId,
      createdAt: { gte: startDate, lte: endDate },
      status: "COMPLETED",
    },
  })

  const byHour = new Map<string, { date: string; hour: number; totalOrders: number; totalRevenue: number; avgOrderValue: number }>()
  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0]
    const hour = order.createdAt.getHours()
    const key = `${date}:${hour}`
    const existing = byHour.get(key) || { date, hour, totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 }
    existing.totalOrders++
    existing.totalRevenue += order.total
    existing.avgOrderValue = existing.totalRevenue / existing.totalOrders
    byHour.set(key, existing)
  }

  return NextResponse.json({
    summaries: Array.from(byHour.values()).sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour),
    source: "live" as const,
  })
}

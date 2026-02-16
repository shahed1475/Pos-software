import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { predictPeakHours } from "@/lib/predictions/peak-hours"
import { forecastSales } from "@/lib/predictions/sales-forecast"
import { getReorderSuggestions } from "@/lib/predictions/reorder-suggestions"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "reports:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const days = parseInt(searchParams.get("days") || "7")

    const tenantId = session.tenantId
    const branchId = session.branchId

    if (type === "peak-hours") {
      // Get last 30 days of hourly data
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const fromDate = thirtyDaysAgo.toISOString().split("T")[0]
      const toDate = new Date().toISOString().split("T")[0]

      const summaries = await prisma.hourlySalesSummary.findMany({
        where: {
          tenantId,
          branchId,
          date: { gte: fromDate, lte: toDate },
        },
      })

      if (summaries.length === 0) {
        // Fallback: calculate from raw orders
        const orders = await prisma.order.findMany({
          where: {
            tenantId,
            branchId,
            createdAt: { gte: thirtyDaysAgo },
            status: "COMPLETED",
          },
        })

        const liveSummaries = orders.map((o) => ({
          date: o.createdAt.toISOString().split("T")[0],
          hour: o.createdAt.getHours(),
          totalOrders: 1,
          totalRevenue: o.total,
        }))

        // Merge by date+hour
        const merged = new Map<string, { date: string; hour: number; totalOrders: number; totalRevenue: number }>()
        for (const s of liveSummaries) {
          const key = `${s.date}:${s.hour}`
          const existing = merged.get(key) || { date: s.date, hour: s.hour, totalOrders: 0, totalRevenue: 0 }
          existing.totalOrders += 1
          existing.totalRevenue += s.totalRevenue
          merged.set(key, existing)
        }

        const result = predictPeakHours(Array.from(merged.values()))
        return NextResponse.json({ ...result, source: "live" })
      }

      const result = predictPeakHours(summaries)
      return NextResponse.json({ ...result, source: "aggregated" })
    }

    if (type === "sales-forecast") {
      // Get last 90 days + forecast ahead
      const lookback = new Date()
      lookback.setDate(lookback.getDate() - 90)
      const fromDate = lookback.toISOString().split("T")[0]
      const toDate = new Date().toISOString().split("T")[0]

      const summaries = await prisma.dailySalesSummary.findMany({
        where: {
          tenantId,
          branchId,
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: "asc" },
      })

      if (summaries.length === 0) {
        // Fallback: calculate from raw orders
        const orders = await prisma.order.findMany({
          where: {
            tenantId,
            branchId,
            createdAt: { gte: lookback },
            status: "COMPLETED",
          },
          orderBy: { createdAt: "asc" },
        })

        const byDate = new Map<string, { date: string; totalRevenue: number; completedOrders: number }>()
        for (const o of orders) {
          const date = o.createdAt.toISOString().split("T")[0]
          const existing = byDate.get(date) || { date, totalRevenue: 0, completedOrders: 0 }
          existing.totalRevenue += o.total
          existing.completedOrders += 1
          byDate.set(date, existing)
        }

        const result = forecastSales(Array.from(byDate.values()), days)
        return NextResponse.json({ ...result, source: "live" })
      }

      const result = forecastSales(summaries, days)
      return NextResponse.json({ ...result, source: "aggregated" })
    }

    if (type === "reorder") {
      // Get latest inventory summaries
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const fromDate = sevenDaysAgo.toISOString().split("T")[0]
      const toDate = new Date().toISOString().split("T")[0]

      const inventorySummaries = await prisma.inventorySummary.findMany({
        where: {
          tenantId,
          branchId,
          date: { gte: fromDate, lte: toDate },
        },
        orderBy: { date: "desc" },
      })

      const currentStock = await prisma.ingredient.findMany({
        where: { tenantId },
      })

      const suggestions = getReorderSuggestions(
        inventorySummaries,
        currentStock.map((i) => ({
          id: i.id,
          name: i.name,
          stock: i.stock,
          minStock: i.minStock,
          unit: i.unit,
          costPerUnit: i.costPerUnit,
        }))
      )

      return NextResponse.json({
        suggestions,
        source: inventorySummaries.length > 0 ? "aggregated" : "live",
      })
    }

    return NextResponse.json({ error: "Invalid type. Use peak-hours, sales-forecast, or reorder" }, { status: 400 })
  } catch (error) {
    console.error("Predictions error:", error)
    return NextResponse.json({ error: "Failed to generate predictions" }, { status: 500 })
  }
}

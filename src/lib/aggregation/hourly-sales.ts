import { prisma } from "@/lib/prisma"

export async function aggregateHourlySales(
  tenantId: string,
  branchId: string,
  dateFrom: string,
  dateTo: string
) {
  const startDate = new Date(dateFrom + "T00:00:00.000Z")
  const endDate = new Date(dateTo + "T23:59:59.999Z")

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      branchId,
      createdAt: { gte: startDate, lte: endDate },
      status: "COMPLETED",
    },
  })

  // Group by date + hour
  const byDateHour = new Map<string, { totalOrders: number; totalRevenue: number }>()
  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0]
    const hour = order.createdAt.getHours()
    const key = `${date}:${hour}`
    const existing = byDateHour.get(key) || { totalOrders: 0, totalRevenue: 0 }
    existing.totalOrders += 1
    existing.totalRevenue += order.total
    byDateHour.set(key, existing)
  }

  // Fill all date+hour combos in range
  const current = new Date(dateFrom)
  const end = new Date(dateTo)
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    for (let h = 0; h < 24; h++) {
      const key = `${dateStr}:${h}`
      if (!byDateHour.has(key)) {
        byDateHour.set(key, { totalOrders: 0, totalRevenue: 0 })
      }
    }
    current.setDate(current.getDate() + 1)
  }

  for (const [key, data] of Array.from(byDateHour.entries())) {
    const [date, hourStr] = key.split(":")
    const hour = parseInt(hourStr)

    await prisma.hourlySalesSummary.upsert({
      where: {
        tenantId_branchId_date_hour: { tenantId, branchId, date, hour },
      },
      create: {
        tenantId,
        branchId,
        date,
        hour,
        totalOrders: data.totalOrders,
        totalRevenue: data.totalRevenue,
        avgOrderValue: data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0,
      },
      update: {
        totalOrders: data.totalOrders,
        totalRevenue: data.totalRevenue,
        avgOrderValue: data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0,
      },
    })
  }
}

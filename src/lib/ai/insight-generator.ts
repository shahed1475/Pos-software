import { format, subDays } from "date-fns"
import { prisma } from "../prisma"

interface GenerateInsightParams {
  tenantId: string
  branchId?: string
  date?: string
}

function getWindow(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(start.getTime() + 86400000)
  return { start, end }
}

export async function generateDailyInsight(params: GenerateInsightParams) {
  const targetDate = params.date || format(subDays(new Date(), 1), "yyyy-MM-dd")
  const previousDate = format(subDays(new Date(`${targetDate}T00:00:00.000Z`), 1), "yyyy-MM-dd")
  const { start, end } = getWindow(targetDate)

  const summaryWhere = {
    tenantId: params.tenantId,
    branchId: params.branchId || undefined,
  }

  const [dailySummary, prevSummary, vendorSales, vendors] = await Promise.all([
    prisma.dailySalesSummary.findFirst({
      where: { ...summaryWhere, date: targetDate },
    }),
    prisma.dailySalesSummary.findFirst({
      where: { ...summaryWhere, date: previousDate },
    }),
    prisma.order.groupBy({
      by: ["vendorId"],
      where: {
        tenantId: params.tenantId,
        branchId: params.branchId || undefined,
        createdAt: { gte: start, lt: end },
        status: { in: ["COMPLETED", "SERVED"] },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.vendor.findMany({
      where: { tenantId: params.tenantId },
      select: { id: true, name: true },
    }),
  ])

  const vendorNameMap = new Map(vendors.map((v) => [v.id, v.name]))
  const revenue = dailySummary?.totalRevenue || 0
  const prevRevenue = prevSummary?.totalRevenue || 0
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0
  const orders = dailySummary?.totalOrders || 0
  const avgOrderValue = dailySummary?.avgOrderValue || 0
  const cancellations = dailySummary?.cancelledOrders || 0

  const title = `Daily Summary: ${targetDate}`
  const summary = `Revenue ${formatMoney(revenue)} (${signedPct(revenueChange)} vs previous day), ${orders} orders, AOV ${formatMoney(avgOrderValue)}.`

  let content = `# Daily Business Summary - ${targetDate}\n\n`
  content += "## Key Metrics\n"
  content += `- Revenue: ${formatMoney(revenue)} (${signedPct(revenueChange)})\n`
  content += `- Orders: ${orders}\n`
  content += `- Average Order Value: ${formatMoney(avgOrderValue)}\n`
  content += `- Tax Collected: ${formatMoney(dailySummary?.totalTax || 0)}\n`
  content += `- Discounts Given: ${formatMoney(dailySummary?.totalDiscount || 0)}\n`
  content += `- Net Profit: ${formatMoney(dailySummary?.netProfit || 0)}\n\n`

  if (vendorSales.length > 0) {
    content += "## Vendor Breakdown\n"
    for (const row of vendorSales) {
      const name = row.vendorId ? vendorNameMap.get(row.vendorId) || "Unknown Vendor" : "Direct"
      content += `- ${name}: ${formatMoney(row._sum.total || 0)} (${row._count} orders)\n`
    }
    content += "\n"
  }

  const anomalies: string[] = []
  if (revenueChange <= -20) anomalies.push(`Revenue dropped ${Math.abs(revenueChange).toFixed(1)}% from previous day.`)
  if (revenueChange >= 50) anomalies.push(`Revenue spiked ${revenueChange.toFixed(1)}% from previous day.`)
  if (orders > 0 && cancellations / orders > 0.1) {
    anomalies.push(`High cancellation rate: ${cancellations} cancellations (${((cancellations / orders) * 100).toFixed(0)}%).`)
  }

  if (anomalies.length > 0) {
    content += "## Anomalies\n"
    for (const anomaly of anomalies) content += `- ${anomaly}\n`
    content += "\n"
  }

  const actions = await generateSuggestions(params.tenantId, params.branchId)
  if (actions.length > 0) {
    content += "## Suggested Actions\n"
    for (const action of actions.slice(0, 5)) content += `- ${action}\n`
  }

  return prisma.aIInsight.create({
    data: {
      tenantId: params.tenantId,
      type: "daily_summary",
      period: targetDate,
      title,
      summary,
      content,
      data: JSON.stringify({
        dailySummary,
        prevSummary,
        vendorSales,
        revenueChange,
        branchId: params.branchId || null,
      }),
    },
  })
}

export async function generateSuggestions(tenantId: string, branchId?: string) {
  const suggestions: string[] = []

  const lowStock = await prisma.ingredient.findMany({
    where: { tenantId },
    orderBy: { stock: "asc" },
    take: 100,
  })
  const criticalStock = lowStock.filter((i) => i.minStock > 0 && i.stock <= i.minStock)
  if (criticalStock.length > 0) {
    suggestions.push(
      `${criticalStock.length} ingredients are below minimum stock: ${criticalStock
        .slice(0, 3)
        .map((i) => i.name)
        .join(", ")}.`
    )
  }

  const since = subDays(new Date(), 7)
  const [allItems, orderedItems] = await Promise.all([
    prisma.menuItem.findMany({
      where: { tenantId, available: true },
      select: { id: true, name: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          tenantId,
          branchId: branchId || undefined,
          createdAt: { gte: since },
        },
      },
      select: { menuItemId: true },
      distinct: ["menuItemId"],
    }),
  ])
  const orderedSet = new Set(orderedItems.map((o) => o.menuItemId))
  const staleItems = allItems.filter((item) => !orderedSet.has(item.id))
  if (staleItems.length > 0) {
    suggestions.push(
      `${staleItems.length} menu items had no sales in the last 7 days: ${staleItems
        .slice(0, 3)
        .map((item) => item.name)
        .join(", ")}.`
    )
  }

  return suggestions
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

function signedPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

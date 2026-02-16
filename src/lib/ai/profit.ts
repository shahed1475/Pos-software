import { prisma } from "../prisma"

// Menu Engineering Matrix: Star, Puzzle, Plowhorse, Dog
export interface MenuItemAnalysis {
  id: string
  name: string
  categoryName: string
  price: number
  costPrice: number
  margin: number
  marginPercent: number
  totalSold: number
  totalRevenue: number
  totalProfit: number
  popularity: "HIGH" | "LOW"
  profitability: "HIGH" | "LOW"
  classification: "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG"
  recommendation: string
}

export async function getMenuEngineeringMatrix(params: {
  tenantId: string
  vendorId?: string
  daysBack?: number
}): Promise<MenuItemAnalysis[]> {
  const { tenantId, vendorId, daysBack = 30 } = params
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

  const where: any = { tenantId }
  if (vendorId) where.vendorId = vendorId

  const menuItems = await prisma.menuItem.findMany({
    where,
    include: { category: { select: { name: true } } },
  })

  // Get sales data
  const orderItemWhere: any = {
    order: { tenantId, createdAt: { gte: since }, status: { in: ["COMPLETED", "SERVED"] } },
  }
  if (vendorId) orderItemWhere.order.vendorId = vendorId

  const salesData = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: orderItemWhere,
    _sum: { quantity: true },
  })

  const salesMap = new Map(salesData.map((s) => [s.menuItemId, s._sum.quantity || 0]))

  // Calculate metrics
  const items = menuItems.map((item) => {
    const totalSold = salesMap.get(item.id) || 0
    const margin = item.price - (item.costPrice || 0)
    const marginPercent = item.price > 0 ? (margin / item.price) * 100 : 0
    const totalRevenue = totalSold * item.price
    const totalProfit = totalSold * margin

    return {
      id: item.id,
      name: item.name,
      categoryName: item.category?.name || "",
      price: item.price,
      costPrice: item.costPrice || 0,
      margin,
      marginPercent,
      totalSold,
      totalRevenue,
      totalProfit,
    }
  })

  // Determine thresholds (median-based)
  const soldValues = items.map((i) => i.totalSold).sort((a, b) => a - b)
  const marginValues = items.map((i) => i.marginPercent).sort((a, b) => a - b)

  const medianSold = soldValues[Math.floor(soldValues.length / 2)] || 0
  const medianMargin = marginValues[Math.floor(marginValues.length / 2)] || 0

  return items.map((item) => {
    const popularity: "HIGH" | "LOW" = item.totalSold >= medianSold ? "HIGH" : "LOW"
    const profitability: "HIGH" | "LOW" = item.marginPercent >= medianMargin ? "HIGH" : "LOW"

    let classification: "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG"
    let recommendation: string

    if (popularity === "HIGH" && profitability === "HIGH") {
      classification = "STAR"
      recommendation = "Maintain quality and prominence. Feature in promotions."
    } else if (popularity === "LOW" && profitability === "HIGH") {
      classification = "PUZZLE"
      recommendation = "Increase visibility. Move to better menu position. Consider marketing."
    } else if (popularity === "HIGH" && profitability === "LOW") {
      classification = "PLOWHORSE"
      recommendation = "Reduce costs or slightly increase price. Pair with high-margin sides."
    } else {
      classification = "DOG"
      recommendation = "Consider removing or reinventing. Replace with new offerings."
    }

    return { ...item, popularity, profitability, classification, recommendation }
  })
}

export async function getDiscountAnalysis(params: {
  tenantId: string
  daysBack?: number
}) {
  const since = new Date(Date.now() - (params.daysBack || 30) * 24 * 60 * 60 * 1000)

  const orders = await prisma.order.findMany({
    where: {
      tenantId: params.tenantId,
      createdAt: { gte: since },
      discount: { gt: 0 },
    },
    select: {
      id: true,
      subtotal: true,
      discount: true,
      discountType: true,
      total: true,
      staffId: true,
      staff: { select: { name: true } },
    },
  })

  const totalDiscounted = orders.length
  const totalDiscountAmount = orders.reduce((sum, o) => sum + o.discount, 0)
  const avgDiscountPercent = orders.length > 0
    ? orders.reduce((sum, o) => {
        const pct = o.subtotal > 0 ? (o.discount / o.subtotal) * 100 : 0
        return sum + pct
      }, 0) / orders.length
    : 0

  // Group by staff to detect potential misuse
  const byStaff: Record<string, { name: string; count: number; total: number }> = {}
  for (const order of orders) {
    const key = order.staffId
    if (!byStaff[key]) byStaff[key] = { name: order.staff?.name || "Unknown", count: 0, total: 0 }
    byStaff[key].count++
    byStaff[key].total += order.discount
  }

  const staffDiscounts = Object.entries(byStaff)
    .map(([staffId, data]) => ({ staffId, ...data }))
    .sort((a, b) => b.total - a.total)

  return {
    totalDiscounted,
    totalDiscountAmount,
    avgDiscountPercent,
    staffDiscounts,
    alerts: staffDiscounts
      .filter((s) => s.count > 10 && s.total > totalDiscountAmount * 0.3)
      .map((s) => `${s.name} applied ${s.count} discounts totaling $${s.total.toFixed(2)} — review for potential misuse`),
  }
}

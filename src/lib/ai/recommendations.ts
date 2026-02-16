import { prisma } from "../prisma"

export interface Recommendation {
  menuItemId: string
  name: string
  price: number
  score: number
  reason: string
}

// Frequently bought together
export async function getFrequentlyBoughtTogether(params: {
  menuItemId: string
  tenantId: string
  limit?: number
}): Promise<Recommendation[]> {
  const { menuItemId, tenantId, limit = 5 } = params

  // Find orders containing this item
  const ordersWithItem = await prisma.orderItem.findMany({
    where: { menuItemId, order: { tenantId, status: { in: ["COMPLETED", "SERVED"] } } },
    select: { orderId: true },
    take: 200,
  })

  const orderIds = ordersWithItem.map((o) => o.orderId)
  if (orderIds.length === 0) return []

  // Find other items in those orders
  const coItems = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      orderId: { in: orderIds },
      menuItemId: { not: menuItemId },
    },
    _count: true,
    orderBy: { _count: { menuItemId: "desc" } },
    take: limit,
  })

  const itemIds = coItems.map((c) => c.menuItemId)
  const items = await prisma.menuItem.findMany({
    where: { id: { in: itemIds }, available: true },
    select: { id: true, name: true, price: true },
  })
  const itemMap = new Map(items.map((i) => [i.id, i]))

  return coItems
    .filter((c) => itemMap.has(c.menuItemId))
    .map((c) => {
      const item = itemMap.get(c.menuItemId)!
      return {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        score: c._count / orderIds.length,
        reason: `Ordered together ${c._count} times`,
      }
    })
}

// Time-based recommendations (popular at current hour)
export async function getTimeBasedRecommendations(params: {
  tenantId: string
  vendorId?: string
  limit?: number
}): Promise<Recommendation[]> {
  const { tenantId, vendorId, limit = 10 } = params
  const currentHour = new Date().getHours()
  const hourRange = [
    (currentHour - 1 + 24) % 24,
    currentHour,
    (currentHour + 1) % 24,
  ]

  // Find popular items ordered at similar times
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const orderWhere: any = {
    tenantId,
    createdAt: { gte: since },
    status: { in: ["COMPLETED", "SERVED"] },
  }
  if (vendorId) orderWhere.vendorId = vendorId

  const orders = await prisma.order.findMany({
    where: orderWhere,
    select: { id: true, createdAt: true },
  })

  const relevantOrderIds = orders
    .filter((o) => hourRange.includes(new Date(o.createdAt).getHours()))
    .map((o) => o.id)

  if (relevantOrderIds.length === 0) return []

  const popularItems = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: { orderId: { in: relevantOrderIds } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  })

  const itemIds = popularItems.map((p) => p.menuItemId)
  const items = await prisma.menuItem.findMany({
    where: { id: { in: itemIds }, available: true },
    select: { id: true, name: true, price: true },
  })
  const itemMap = new Map(items.map((i) => [i.id, i]))

  return popularItems
    .filter((p) => itemMap.has(p.menuItemId))
    .map((p) => {
      const item = itemMap.get(p.menuItemId)!
      return {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        score: p._sum.quantity || 0,
        reason: `Popular around ${currentHour}:00 (${p._sum.quantity} ordered)`,
      }
    })
}

// Profit-prioritized recommendations
export async function getProfitPrioritizedRecommendations(params: {
  tenantId: string
  vendorId?: string
  limit?: number
}): Promise<Recommendation[]> {
  const { tenantId, vendorId, limit = 10 } = params

  const where: any = { tenantId, available: true, costPrice: { gt: 0 } }
  if (vendorId) where.vendorId = vendorId

  const items = await prisma.menuItem.findMany({
    where,
    select: { id: true, name: true, price: true, costPrice: true },
  })

  return items
    .map((item) => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      score: item.price - (item.costPrice || 0),
      reason: `Margin: $${(item.price - (item.costPrice || 0)).toFixed(2)} (${((1 - (item.costPrice || 0) / item.price) * 100).toFixed(0)}%)`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

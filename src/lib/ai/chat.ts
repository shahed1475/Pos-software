import { format, subDays } from "date-fns"
import { prisma } from "../prisma"

export interface ChatContext {
  tenantId: string
  branchId?: string
}

const DISALLOWED_PATTERNS = [
  /delete|remove|drop\s+table|truncate|reset|wipe/i,
  /password|secret|token|key|credential/i,
  /raw\s+sql|sql\s+query|export\s+all/i,
]

const QUERY_PATTERNS = [
  { pattern: /revenue|sales|earning/i, handler: handleRevenueQuery },
  { pattern: /order|busy|peak/i, handler: handleOrderQuery },
  { pattern: /vendor|merchant/i, handler: handleVendorQuery },
  { pattern: /inventory|stock|ingredient/i, handler: handleInventoryQuery },
  { pattern: /staff|employee/i, handler: handleStaffQuery },
  { pattern: /menu|item|popular/i, handler: handleMenuQuery },
  { pattern: /suggest|recommend|improve/i, handler: handleSuggestionQuery },
]

export async function processChat(context: ChatContext, message: string): Promise<string> {
  const normalized = message.trim()
  if (!normalized) return "Please enter a question."

  if (DISALLOWED_PATTERNS.some((p) => p.test(normalized))) {
    return "I can only answer read-only business questions. I cannot perform destructive actions or expose sensitive credentials."
  }

  for (const { pattern, handler } of QUERY_PATTERNS) {
    if (pattern.test(normalized)) return handler(context)
  }

  return getDefaultResponse()
}

async function handleRevenueQuery(ctx: ChatContext): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd")
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd")

  const [todaySummary, weekSummaries] = await Promise.all([
    prisma.dailySalesSummary.findFirst({
      where: { tenantId: ctx.tenantId, branchId: ctx.branchId || undefined, date: today },
    }),
    prisma.dailySalesSummary.findMany({
      where: { tenantId: ctx.tenantId, branchId: ctx.branchId || undefined, date: { gte: weekAgo } },
      orderBy: { date: "desc" },
    }),
  ])

  const weekRevenue = weekSummaries.reduce((sum, d) => sum + d.totalRevenue, 0)
  const weekOrders = weekSummaries.reduce((sum, d) => sum + d.totalOrders, 0)
  return [
    "Revenue overview:",
    `- Today: ${money(todaySummary?.totalRevenue || 0)} from ${todaySummary?.totalOrders || 0} orders`,
    `- Last 7 days: ${money(weekRevenue)} from ${weekOrders} orders`,
    `- Daily average: ${money(weekRevenue / 7)}`,
    `- Avg order value today: ${money(todaySummary?.avgOrderValue || 0)}`,
  ].join("\n")
}

async function handleOrderQuery(ctx: ChatContext): Promise<string> {
  const [active, todayTotal] = await Promise.all([
    prisma.order.count({
      where: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId || undefined,
        status: { in: ["NEW", "PREPARING", "READY"] },
      },
    }),
    prisma.order.count({
      where: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId || undefined,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ])

  return [
    `Active orders: ${active}`,
    `Total orders today: ${todayTotal}`,
    "Active statuses include NEW, PREPARING, and READY.",
  ].join("\n")
}

async function handleVendorQuery(ctx: ChatContext): Promise<string> {
  const vendors = await prisma.vendor.findMany({
    where: { tenantId: ctx.tenantId, active: true },
    include: { _count: { select: { orders: true, menuItems: true } } },
    orderBy: { name: "asc" },
  })
  if (vendors.length === 0) return "No active vendors found for this tenant."

  const lines = [`Active vendors: ${vendors.length}`]
  for (const vendor of vendors) {
    lines.push(
      `- ${vendor.name}: ${vendor._count.menuItems} menu items, ${vendor._count.orders} orders, ${vendor.commissionRate}% commission`
    )
  }
  return lines.join("\n")
}

async function handleInventoryQuery(ctx: ChatContext): Promise<string> {
  const ingredients = await prisma.ingredient.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { stock: "asc" },
  })

  const lowStock = ingredients.filter((i) => i.minStock > 0 && i.stock <= i.minStock)
  if (lowStock.length === 0) {
    return `Inventory overview: ${ingredients.length} ingredients tracked. All are above minimum stock.`
  }

  const lines = [`Inventory overview: ${ingredients.length} ingredients tracked`, `Low stock alerts: ${lowStock.length}`]
  for (const item of lowStock.slice(0, 10)) {
    lines.push(`- ${item.name}: ${item.stock} ${item.unit} (min ${item.minStock})`)
  }
  return lines.join("\n")
}

async function handleStaffQuery(ctx: ChatContext): Promise<string> {
  const staff = await prisma.staff.findMany({
    where: { tenantId: ctx.tenantId, branchId: ctx.branchId || undefined, active: true },
    select: { role: true },
  })

  const counts: Record<string, number> = {}
  for (const member of staff) counts[member.role] = (counts[member.role] || 0) + 1

  const lines = [`Active staff: ${staff.length}`]
  for (const [role, count] of Object.entries(counts)) lines.push(`- ${role}: ${count}`)
  return lines.join("\n")
}

async function handleMenuQuery(ctx: ChatContext): Promise<string> {
  const [items, categories] = await Promise.all([
    prisma.menuItem.count({ where: { tenantId: ctx.tenantId, available: true } }),
    prisma.category.count({ where: { tenantId: ctx.tenantId, active: true } }),
  ])

  const topItems = await prisma.orderItem.groupBy({
    by: ["menuItemId"],
    where: {
      order: {
        tenantId: ctx.tenantId,
        branchId: ctx.branchId || undefined,
        createdAt: { gte: subDays(new Date(), 7) },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  })

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: topItems.map((i) => i.menuItemId) } },
    select: { id: true, name: true },
  })
  const itemNames = new Map(menuItems.map((item) => [item.id, item.name]))

  const lines = [`Menu: ${items} available items across ${categories} categories`]
  if (topItems.length > 0) {
    lines.push("Top 5 items this week:")
    topItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${itemNames.get(item.menuItemId) || "Unknown"} (${item._sum.quantity || 0} sold)`)
    })
  }
  return lines.join("\n")
}

async function handleSuggestionQuery(ctx: ChatContext): Promise<string> {
  const { generateSuggestions } = await import("./insight-generator")
  const suggestions = await generateSuggestions(ctx.tenantId, ctx.branchId)
  if (suggestions.length === 0) return "No immediate operational suggestions right now."

  return [
    "Suggestions:",
    ...suggestions.slice(0, 5).map((suggestion, index) => `${index + 1}. ${suggestion}`),
  ].join("\n")
}

function getDefaultResponse() {
  return [
    "I can help with read-only business questions:",
    "- Revenue and sales trends",
    "- Active orders and volume",
    "- Vendor performance",
    "- Inventory status",
    "- Staff overview",
    "- Menu performance",
    "- Improvement suggestions",
  ].join("\n")
}

function money(value: number) {
  return `$${value.toFixed(2)}`
}

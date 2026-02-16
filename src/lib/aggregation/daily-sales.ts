import { prisma } from "@/lib/prisma"

export async function aggregateDailySales(
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
      payments: true,
    },
  })

  // Group orders by date
  const byDate = new Map<string, typeof orders>()
  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(order)
  }

  // Get expenses for the period
  let expensesByDate = new Map<string, number>()
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        tenantId,
        branchId,
        date: { gte: startDate, lte: endDate },
      },
    })
    for (const exp of expenses) {
      const date = exp.date.toISOString().split("T")[0]
      expensesByDate.set(date, (expensesByDate.get(date) || 0) + exp.amount)
    }
  } catch {
    // Expense model may not exist
  }

  // Fill in all dates in range
  const current = new Date(dateFrom)
  const end = new Date(dateTo)
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    if (!byDate.has(dateStr)) byDate.set(dateStr, [])
    current.setDate(current.getDate() + 1)
  }

  for (const [date, dayOrders] of Array.from(byDate.entries())) {
    const completed = dayOrders.filter((o) => o.status === "COMPLETED")
    const cancelled = dayOrders.filter((o) => o.status === "CANCELLED")

    const totalRevenue = completed.reduce((s, o) => s + o.total, 0)
    const totalTax = completed.reduce((s, o) => s + o.taxAmount, 0)
    const totalDiscount = completed.reduce((s, o) => s + o.discount, 0)

    // COGS from recipes
    let totalCOGS = 0
    for (const order of completed) {
      for (const item of order.items) {
        for (const ing of item.menuItem.ingredients) {
          totalCOGS += ing.quantity * item.quantity * ing.ingredient.costPerUnit
        }
      }
    }

    const totalExpenses = expensesByDate.get(date) || 0
    const netProfit = totalRevenue - totalTax - totalCOGS - totalExpenses

    // Top items by revenue
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const order of completed) {
      for (const item of order.items) {
        const key = item.menuItemId
        const existing = itemMap.get(key) || { name: item.menuItem?.name || "Unknown", quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.unitPrice * item.quantity
        itemMap.set(key, existing)
      }
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)

    // Payment methods
    const paymentMethods: Record<string, number> = {}
    for (const order of completed) {
      for (const p of order.payments) {
        paymentMethods[p.method] = (paymentMethods[p.method] || 0) + p.amount
      }
    }

    await prisma.dailySalesSummary.upsert({
      where: {
        tenantId_branchId_date: { tenantId, branchId, date },
      },
      create: {
        tenantId,
        branchId,
        date,
        totalOrders: dayOrders.length,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalRevenue,
        totalTax,
        totalDiscount,
        totalCOGS,
        totalExpenses,
        netProfit,
        avgOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        topItemsJson: JSON.stringify(topItems),
        paymentMethodsJson: JSON.stringify(paymentMethods),
      },
      update: {
        totalOrders: dayOrders.length,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalRevenue,
        totalTax,
        totalDiscount,
        totalCOGS,
        totalExpenses,
        netProfit,
        avgOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        topItemsJson: JSON.stringify(topItems),
        paymentMethodsJson: JSON.stringify(paymentMethods),
      },
    })
  }
}

import { prisma } from "@/lib/prisma"

export async function aggregateInventory(
  tenantId: string,
  branchId: string,
  dateFrom: string,
  dateTo: string
) {
  const startDate = new Date(dateFrom + "T00:00:00.000Z")
  const endDate = new Date(dateTo + "T23:59:59.999Z")

  const ingredients = await prisma.ingredient.findMany({
    where: { tenantId },
  })

  // Get inventory logs for the period
  const logs = await prisma.inventoryLog.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  // Get purchases
  const purchases = await prisma.purchase.findMany({
    where: {
      branchId,
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  // Get waste
  const wastes = await prisma.waste.findMany({
    where: {
      tenantId,
      branchId,
      createdAt: { gte: startDate, lte: endDate },
    },
  })

  // Group by date and ingredient
  const current = new Date(dateFrom)
  const end = new Date(dateTo)

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]
    const dayStart = new Date(dateStr + "T00:00:00.000Z")
    const dayEnd = new Date(dateStr + "T23:59:59.999Z")

    for (const ingredient of ingredients) {
      const dayLogs = logs.filter(
        (l) => l.ingredientId === ingredient.id &&
          l.createdAt >= dayStart && l.createdAt <= dayEnd
      )

      const dayPurchases = purchases.filter(
        (p) => p.ingredientId === ingredient.id &&
          p.createdAt >= dayStart && p.createdAt <= dayEnd
      )

      const dayWastes = wastes.filter(
        (w) => w.ingredientId === ingredient.id &&
          w.createdAt >= dayStart && w.createdAt <= dayEnd
      )

      // Opening stock: first log's previousStock, or current stock if no logs
      const openingStock = dayLogs.length > 0
        ? dayLogs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0].previousStock
        : ingredient.stock

      // Closing stock: last log's newStock, or current stock
      const closingStock = dayLogs.length > 0
        ? dayLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].newStock
        : ingredient.stock

      const totalConsumed = dayLogs
        .filter((l) => l.type === "ORDER_DEDUCTION" || l.type === "MANUAL_ADJUSTMENT")
        .reduce((s, l) => s + Math.abs(l.quantity), 0)

      const totalPurchased = dayPurchases.reduce((s, p) => s + p.quantity, 0)
      const totalWasted = dayWastes.reduce((s, w) => s + w.quantity, 0)

      // Rolling 7-day average usage
      const sevenDaysAgo = new Date(dateStr)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentLogs = logs.filter(
        (l) => l.ingredientId === ingredient.id &&
          l.createdAt >= sevenDaysAgo && l.createdAt <= dayEnd &&
          (l.type === "ORDER_DEDUCTION" || l.type === "MANUAL_ADJUSTMENT")
      )
      const totalRecentUsage = recentLogs.reduce((s, l) => s + Math.abs(l.quantity), 0)
      const avgDailyUsage = totalRecentUsage / 7

      await prisma.inventorySummary.upsert({
        where: {
          tenantId_branchId_date_ingredientId: { tenantId, branchId, date: dateStr, ingredientId: ingredient.id },
        },
        create: {
          tenantId,
          branchId,
          date: dateStr,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          openingStock,
          closingStock,
          totalConsumed,
          totalPurchased,
          totalWasted,
          avgDailyUsage,
          costPerUnit: ingredient.costPerUnit,
        },
        update: {
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          openingStock,
          closingStock,
          totalConsumed,
          totalPurchased,
          totalWasted,
          avgDailyUsage,
          costPerUnit: ingredient.costPerUnit,
        },
      })
    }

    current.setDate(current.getDate() + 1)
  }
}

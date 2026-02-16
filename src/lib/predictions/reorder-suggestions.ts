interface InventorySummaryInput {
  ingredientId: string
  ingredientName: string
  unit: string
  avgDailyUsage: number
  costPerUnit: number
}

interface CurrentStockItem {
  id: string
  name: string
  stock: number
  minStock: number
  unit: string
  costPerUnit: number
}

export interface ReorderSuggestion {
  ingredientId: string
  ingredientName: string
  unit: string
  currentStock: number
  avgDailyUsage: number
  daysUntilStockout: number
  urgency: "CRITICAL" | "LOW" | "OK"
  suggestedReorderQty: number
  estimatedCost: number
}

export function getReorderSuggestions(
  inventorySummaries: InventorySummaryInput[],
  currentStock: CurrentStockItem[]
): ReorderSuggestion[] {
  const suggestions: ReorderSuggestion[] = []

  // Get latest avg daily usage per ingredient
  const usageMap = new Map<string, { avgDailyUsage: number; costPerUnit: number }>()
  for (const s of inventorySummaries) {
    // Keep the latest entry for each ingredient
    usageMap.set(s.ingredientId, { avgDailyUsage: s.avgDailyUsage, costPerUnit: s.costPerUnit })
  }

  for (const item of currentStock) {
    const usage = usageMap.get(item.id)
    const avgDailyUsage = usage?.avgDailyUsage || 0
    const costPerUnit = usage?.costPerUnit || item.costPerUnit

    const daysUntilStockout = avgDailyUsage > 0
      ? item.stock / avgDailyUsage
      : item.stock > 0 ? 999 : 0

    let urgency: "CRITICAL" | "LOW" | "OK" = "OK"
    if (daysUntilStockout < 3) urgency = "CRITICAL"
    else if (daysUntilStockout < 7) urgency = "LOW"

    // Suggest enough for 14 days
    const targetStock = avgDailyUsage * 14
    const suggestedReorderQty = Math.max(0, Math.ceil(targetStock - item.stock))

    suggestions.push({
      ingredientId: item.id,
      ingredientName: item.name,
      unit: item.unit,
      currentStock: item.stock,
      avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
      daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
      urgency,
      suggestedReorderQty,
      estimatedCost: Math.round(suggestedReorderQty * costPerUnit * 100) / 100,
    })
  }

  return suggestions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
}

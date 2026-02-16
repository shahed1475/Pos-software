import { prisma } from "./prisma"

interface StockWarning {
  ingredientId: string
  ingredientName: string
  required: number
  available: number
  unit: string
  sufficient: boolean
}

export async function validateStock(
  menuItemIds: { menuItemId: string; quantity: number }[],
  tenantId?: string
): Promise<{ valid: boolean; warnings: StockWarning[] }> {
  const warnings: StockWarning[] = []

  // Get all menu items with their ingredient recipes
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds.map((i) => i.menuItemId) },
      ...(tenantId && { tenantId }),
    },
    include: {
      ingredients: { include: { ingredient: true } },
    },
  })

  // Aggregate total required quantities per ingredient
  const requiredMap = new Map<string, { required: number; ingredient: any }>()

  for (const orderItem of menuItemIds) {
    const menuItem = menuItems.find((m) => m.id === orderItem.menuItemId)
    if (!menuItem) continue

    for (const recipe of menuItem.ingredients) {
      const totalNeeded = recipe.quantity * orderItem.quantity
      const existing = requiredMap.get(recipe.ingredientId) || {
        required: 0,
        ingredient: recipe.ingredient,
      }
      existing.required += totalNeeded
      requiredMap.set(recipe.ingredientId, existing)
    }
  }

  let valid = true
  for (const [ingredientId, { required, ingredient }] of requiredMap) {
    const sufficient = ingredient.stock >= required
    if (!sufficient) valid = false
    warnings.push({
      ingredientId,
      ingredientName: ingredient.name,
      required,
      available: ingredient.stock,
      unit: ingredient.unit,
      sufficient,
    })
  }

  return { valid, warnings: warnings.filter((w) => !w.sufficient) }
}

export async function deductStock(
  orderId: string,
  staffId?: string,
  tenantId?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
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
    },
  })

  if (!order) return

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      for (const recipe of item.menuItem.ingredients) {
        const deductQty = recipe.quantity * item.quantity
        const ingredient = await tx.ingredient.findUnique({
          where: { id: recipe.ingredientId },
        })
        if (!ingredient) continue

        const previousStock = ingredient.stock
        const newStock = Math.max(0, previousStock - deductQty)

        await tx.ingredient.update({
          where: { id: recipe.ingredientId },
          data: { stock: newStock },
        })

        await tx.inventoryLog.create({
          data: {
            ingredientId: recipe.ingredientId,
            type: "ORDER_DEDUCTION",
            quantity: -deductQty,
            previousStock,
            newStock,
            reason: `Order #${order.orderNumber}`,
            referenceId: orderId,
            staffId,
            tenantId,
          },
        })
      }
    }
  })
}

export async function rollbackStock(
  orderId: string,
  staffId?: string,
  tenantId?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
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
    },
  })

  if (!order) return

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      for (const recipe of item.menuItem.ingredients) {
        const rollbackQty = recipe.quantity * item.quantity
        const ingredient = await tx.ingredient.findUnique({
          where: { id: recipe.ingredientId },
        })
        if (!ingredient) continue

        const previousStock = ingredient.stock
        const newStock = previousStock + rollbackQty

        await tx.ingredient.update({
          where: { id: recipe.ingredientId },
          data: { stock: newStock },
        })

        await tx.inventoryLog.create({
          data: {
            ingredientId: recipe.ingredientId,
            type: "ORDER_CANCELLATION_ROLLBACK",
            quantity: rollbackQty,
            previousStock,
            newStock,
            reason: `Cancelled Order #${order.orderNumber}`,
            referenceId: orderId,
            staffId,
            tenantId,
          },
        })
      }
    }
  })
}

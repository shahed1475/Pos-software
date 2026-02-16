import { prisma } from "./prisma"

interface CartItemWithVendor {
  id: string
  vendorId: string | null
  menuItemId: string
  quantity: number
  unitPrice: number
  variant: string | null
  notes: string | null
}

interface VendorGroup {
  vendorId: string | null
  items: CartItemWithVendor[]
  subtotal: number
}

export function splitCartByVendor(items: CartItemWithVendor[]): VendorGroup[] {
  const groups = new Map<string, VendorGroup>()

  for (const item of items) {
    const key = item.vendorId || "__no_vendor__"
    if (!groups.has(key)) {
      groups.set(key, { vendorId: item.vendorId, items: [], subtotal: 0 })
    }
    const group = groups.get(key)!
    group.items.push(item)
    group.subtotal += item.unitPrice * item.quantity
  }

  return Array.from(groups.values())
}

export function calculateOrderTotals(params: {
  subtotal: number
  taxRate: number
  discount?: number
  discountType?: string | null
  serviceChargeRate?: number
}) {
  const { subtotal, taxRate, discount = 0, discountType, serviceChargeRate = 0 } = params

  let discountAmount = 0
  if (discount && discountType) {
    discountAmount = discountType === "PERCENTAGE"
      ? subtotal * (discount / 100)
      : discount
  }

  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (taxRate / 100)
  const serviceCharge = subtotal * (serviceChargeRate / 100)
  const total = taxableAmount + taxAmount + serviceCharge

  return { subtotal, discount: discountAmount, taxAmount, serviceCharge, total }
}

export async function checkoutCart(params: {
  cartSessionId: string
  tenantId: string
  branchId: string
  staffId: string
  type: string
  tableId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerAddr?: string | null
  notes?: string | null
}) {
  const cart = await prisma.cartSession.findFirst({
    where: { id: params.cartSessionId, tenantId: params.tenantId, status: "OPEN" },
    include: { items: true },
  })

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty or not found")
  }

  // Get branch tax rate
  let taxRate = 0
  if (params.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: params.branchId } })
    taxRate = branch?.taxRate || 0
  }

  // Split items by vendor
  const vendorGroups = splitCartByVendor(cart.items)
  const orders: any[] = []

  for (const group of vendorGroups) {
    const totals = calculateOrderTotals({
      subtotal: group.subtotal,
      taxRate,
    })

    const order = await prisma.order.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        vendorId: group.vendorId,
        type: params.type,
        status: "NEW",
        tableId: params.tableId || (cart.tableId || null),
        staffId: params.staffId,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerAddr: params.customerAddr,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: totals.discount,
        serviceCharge: totals.serviceCharge,
        total: totals.total,
        notes: params.notes,
        items: {
          create: group.items.map((item) => ({
            vendorId: item.vendorId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            variant: item.variant,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: { include: { menuItem: true } },
        vendor: { select: { id: true, name: true } },
      },
    })

    orders.push(order)
  }

  // Close the cart
  await prisma.cartSession.update({
    where: { id: params.cartSessionId },
    data: { status: "CLOSED" },
  })

  // Update table status if dine-in
  if (params.type === "DINE_IN" && cart.tableId) {
    await prisma.table.update({
      where: { id: cart.tableId },
      data: { status: "OCCUPIED" },
    })
  }

  return orders
}

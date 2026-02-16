import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createOrderSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:create")) return forbiddenResponse()

    const tab = await prisma.tab.findFirst({
      where: { id: params.id, tenantId: session.tenantId, status: "OPEN" },
    })
    if (!tab) return NextResponse.json({ error: "Tab not found or closed" }, { status: 404 })

    const body = await request.json()
    const validated = createOrderSchema.parse(body)

    // Calculate totals
    let taxRate = 0
    if (session.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: session.branchId } })
      taxRate = branch?.taxRate || 0
    }

    const subtotal = validated.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    let discount = 0
    if (validated.discount && validated.discountType) {
      discount = validated.discountType === "PERCENTAGE" ? subtotal * (validated.discount / 100) : validated.discount
    }
    const taxableAmount = subtotal - discount
    const taxAmount = taxableAmount * (taxRate / 100)
    const total = taxableAmount + taxAmount

    const order = await prisma.order.create({
      data: {
        type: validated.type,
        status: "NEW",
        tableId: tab.tableId || validated.tableId || null,
        staffId: session.staffId,
        customerName: tab.guestName || validated.customerName,
        subtotal,
        taxAmount,
        discount,
        discountType: validated.discountType || null,
        total,
        notes: validated.notes,
        ...(session.tenantId && { tenantId: session.tenantId }),
        ...(session.branchId && { branchId: session.branchId }),
        items: {
          create: validated.items.map((item) => ({
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
      },
    })

    // Link order to tab
    await prisma.tabOrder.create({
      data: { tabId: tab.id, orderId: order.id },
    })

    // Update tab total
    await prisma.tab.update({
      where: { id: tab.id },
      data: { totalSpent: { increment: total } },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to add items to tab" }, { status: 500 })
  }
}

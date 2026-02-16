import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createOrderSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = searchParams.get("limit")
    const type = searchParams.get("type")

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId
    if (session.branchId) where.branchId = session.branchId
    if (status) {
      if (status === "active") {
        where.status = { in: ["NEW", "PREPARING", "READY", "SERVED"] }
      } else {
        where.status = status
      }
    }
    if (type) where.type = type

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { id: true, name: true } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
    })
    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:create")) return forbiddenResponse()

    const body = await request.json()
    const validated = createOrderSchema.parse(body)

    // Fetch branch tax rate
    let taxRate = 0
    if (session.branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: session.branchId } })
      taxRate = branch?.taxRate || 0
    } else {
      const restaurant = await (prisma as any).restaurant?.findFirst?.()
      taxRate = restaurant?.taxRate || 0
    }

    // Calculate totals
    const subtotal = validated.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    )

    let discount = 0
    if (validated.discount && validated.discountType) {
      discount = validated.discountType === "PERCENTAGE"
        ? subtotal * (validated.discount / 100)
        : validated.discount
    }

    const taxableAmount = subtotal - discount
    const taxAmount = taxableAmount * (taxRate / 100)
    const total = taxableAmount + taxAmount

    const order = await prisma.order.create({
      data: {
        type: validated.type,
        status: "NEW",
        tableId: validated.tableId || null,
        staffId: session.staffId,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        customerAddr: validated.customerAddr,
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
        table: true,
        staff: { select: { id: true, name: true } },
      },
    })

    // Update table status to OCCUPIED if dine-in
    if (validated.tableId && validated.type === "DINE_IN") {
      await prisma.table.update({
        where: { id: validated.tableId },
        data: { status: "OCCUPIED" },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

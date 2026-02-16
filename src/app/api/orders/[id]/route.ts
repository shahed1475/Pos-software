import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { updateOrderSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:read")) return forbiddenResponse()

    const where: any = { id: params.id }
    if (session.tenantId) where.tenantId = session.tenantId

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { id: true, name: true } },
        payments: true,
      },
    })
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(order)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:update")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateOrderSchema.parse(body)

    if (validated.status === "CANCELLED" && !requirePermission(session.role, "orders:cancel")) {
      return forbiddenResponse()
    }

    // Verify order belongs to tenant
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: params.id,
        ...(session.tenantId && { tenantId: session.tenantId }),
      },
    })
    if (!existingOrder) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updateData: any = {}
    if (validated.status) {
      updateData.status = validated.status
      if (validated.status === "COMPLETED") {
        updateData.completedAt = new Date()
      }
    }
    if (validated.notes !== undefined) updateData.notes = validated.notes
    if (validated.customerName !== undefined) updateData.customerName = validated.customerName
    if (validated.customerPhone !== undefined) updateData.customerPhone = validated.customerPhone
    if (validated.customerAddr !== undefined) updateData.customerAddr = validated.customerAddr

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: { include: { menuItem: true } },
        table: true,
        staff: { select: { id: true, name: true } },
        payments: true,
      },
    })

    // If order is completed or cancelled, free up the table
    if ((validated.status === "COMPLETED" || validated.status === "CANCELLED") && order.tableId) {
      const otherActiveOrders = await prisma.order.count({
        where: {
          tableId: order.tableId,
          id: { not: order.id },
          status: { in: ["NEW", "PREPARING", "READY", "SERVED"] },
        },
      })
      if (otherActiveOrders === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE" },
        })
      }
    }

    // Auto-deduct inventory when order status changes to PREPARING
    if (validated.status === "PREPARING") {
      const orderWithItems = await prisma.order.findUnique({
        where: { id: params.id },
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

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          for (const ing of item.menuItem.ingredients) {
            await prisma.ingredient.update({
              where: { id: ing.ingredientId },
              data: {
                stock: { decrement: ing.quantity * item.quantity },
              },
            })
          }
        }
      }
    }

    // Rollback inventory on cancellation if order was PREPARING or beyond
    if (validated.status === "CANCELLED" && ["PREPARING", "READY", "SERVED"].includes(existingOrder.status)) {
      const orderWithItems = await prisma.order.findUnique({
        where: { id: params.id },
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

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          for (const ing of item.menuItem.ingredients) {
            await prisma.ingredient.update({
              where: { id: ing.ingredientId },
              data: {
                stock: { increment: ing.quantity * item.quantity },
              },
            })
          }
        }
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    console.error("Order update error:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:cancel")) return forbiddenResponse()

    const order = await prisma.order.findFirst({
      where: {
        id: params.id,
        ...(session.tenantId && { tenantId: session.tenantId }),
      },
      select: { tableId: true },
    })
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.order.delete({ where: { id: params.id } })

    if (order?.tableId) {
      const otherActiveOrders = await prisma.order.count({
        where: {
          tableId: order.tableId,
          status: { in: ["NEW", "PREPARING", "READY", "SERVED"] },
        },
      })
      if (otherActiveOrders === 0) {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: "AVAILABLE" },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
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
    const body = await request.json()
    const updateData: any = {}

    if (body.status) {
      updateData.status = body.status
      if (body.status === "COMPLETED") {
        updateData.completedAt = new Date()
      }
    }
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.customerName !== undefined) updateData.customerName = body.customerName
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone
    if (body.customerAddr !== undefined) updateData.customerAddr = body.customerAddr

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
    if ((body.status === "COMPLETED" || body.status === "CANCELLED") && order.tableId) {
      // Check if there are other active orders on this table
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
    if (body.status === "PREPARING") {
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

    return NextResponse.json(order)
  } catch (error) {
    console.error("Order update error:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { tableId: true },
    })

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

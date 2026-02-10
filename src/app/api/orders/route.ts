import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const limit = searchParams.get("limit")
    const type = searchParams.get("type")

    const where: any = {}
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
    const body = await request.json()

    // Fetch restaurant tax rate
    const restaurant = await prisma.restaurant.findFirst()
    const taxRate = restaurant?.taxRate || 0

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0
    )

    let discount = 0
    if (body.discount && body.discountType) {
      discount = body.discountType === "PERCENTAGE"
        ? subtotal * (body.discount / 100)
        : body.discount
    }

    const taxableAmount = subtotal - discount
    const taxAmount = taxableAmount * (taxRate / 100)
    const total = taxableAmount + taxAmount

    const order = await prisma.order.create({
      data: {
        type: body.type,
        status: "NEW",
        tableId: body.tableId || null,
        staffId: body.staffId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddr: body.customerAddr,
        subtotal,
        taxAmount,
        discount,
        discountType: body.discountType || null,
        total,
        notes: body.notes,
        items: {
          create: body.items.map((item: any) => ({
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
    if (body.tableId && body.type === "DINE_IN") {
      await prisma.table.update({
        where: { id: body.tableId },
        data: { status: "OCCUPIED" },
      })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

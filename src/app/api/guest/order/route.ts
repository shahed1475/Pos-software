import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkoutCart } from "@/lib/cart"
import { recordSaleSettlement } from "@/lib/settlement"

// Public guest order placement — no auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestToken, customerName, customerPhone, notes } = body

    if (!guestToken) {
      return NextResponse.json({ error: "Guest token required" }, { status: 400 })
    }

    const cart = await prisma.cartSession.findFirst({
      where: { guestToken, status: "OPEN" },
      include: { items: true },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
    }

    // Get a default staff member for guest orders (system/self-service)
    const systemStaff = await prisma.staff.findFirst({
      where: { tenantId: cart.tenantId, role: { in: ["ADMIN", "CASHIER"] }, active: true },
    })

    if (!systemStaff) {
      return NextResponse.json({ error: "No staff available to process order" }, { status: 500 })
    }

    const orders = await checkoutCart({
      cartSessionId: cart.id,
      tenantId: cart.tenantId,
      branchId: cart.branchId || "",
      staffId: systemStaff.id,
      type: cart.tableId ? "DINE_IN" : "TAKEAWAY",
      tableId: cart.tableId,
      customerName,
      customerPhone,
      notes,
    })

    // Record settlement for vendor orders
    for (const order of orders) {
      if (order.vendorId) {
        await recordSaleSettlement({
          tenantId: cart.tenantId,
          vendorId: order.vendorId,
          orderId: order.id,
          orderTotal: order.total,
          orderType: order.type,
        })
      }
    }

    return NextResponse.json({
      success: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        vendorName: o.vendor?.name,
        total: o.total,
        status: o.status,
      })),
    }, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Order failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Get order status (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const guestToken = searchParams.get("token")

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { menuItem: { select: { id: true, name: true } } },
        },
        vendor: { select: { id: true, name: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      type: order.type,
      vendorName: order.vendor?.name,
      total: order.total,
      items: order.items.map((i) => ({
        name: i.menuItem.name,
        quantity: i.quantity,
        status: i.status,
      })),
      pickupCode: order.pickupCode,
      createdAt: order.createdAt,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

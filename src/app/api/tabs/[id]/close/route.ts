import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "billing:create")) return forbiddenResponse()

    const tab = await prisma.tab.findFirst({
      where: { id: params.id, tenantId: session.tenantId, status: "OPEN" },
      include: { orders: true },
    })
    if (!tab) return NextResponse.json({ error: "Tab not found or already closed" }, { status: 404 })

    const body = await request.json()
    const { paymentMethod = "CASH" } = body

    // Get all orders on this tab
    const orderIds = tab.orders.map((to) => to.orderId)
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
    })

    const totalDue = orders.reduce((sum, o) => sum + o.total, 0)

    // Create payments for all unpaid orders
    for (const order of orders) {
      const existingPayments = await prisma.payment.aggregate({
        where: { orderId: order.id },
        _sum: { amount: true },
      })
      const paid = existingPayments._sum.amount || 0
      const remaining = order.total - paid

      if (remaining > 0) {
        await prisma.payment.create({
          data: { orderId: order.id, method: paymentMethod, amount: remaining },
        })
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        })
      }
    }

    // Close the tab
    const closedTab = await prisma.tab.update({
      where: { id: tab.id },
      data: { status: "CLOSED", totalSpent: totalDue },
    })

    // Free the table if any
    if (tab.tableId) {
      await prisma.table.update({
        where: { id: tab.tableId },
        data: { status: "AVAILABLE" },
      })
    }

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "CLOSE_TAB",
      entity: "Tab",
      entityId: tab.id,
      details: `Closed tab. Total: $${totalDue.toFixed(2)}, Method: ${paymentMethod}`,
    })

    return NextResponse.json({
      tab: closedTab,
      totalDue,
      ordersCount: orders.length,
      paymentMethod,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to close tab" }, { status: 500 })
  }
}

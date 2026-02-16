import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"
import { eventPublisher } from "@/lib/events"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:update")) return forbiddenResponse()

    const order = await prisma.order.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    })
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    if (order.status !== "READY") {
      return NextResponse.json({ error: "Order is not ready for pickup" }, { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status: "SERVED", completedAt: new Date() },
    })

    eventPublisher.publishOrderUpdated({
      orderId: params.id,
      vendorId: order.vendorId || undefined,
      tenantId: order.tenantId || undefined,
      branchId: order.branchId || undefined,
      data: { status: "SERVED" },
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "PICKUP_CONFIRMED",
      entity: "Order",
      entityId: params.id,
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Failed to confirm pickup" }, { status: 500 })
  }
}

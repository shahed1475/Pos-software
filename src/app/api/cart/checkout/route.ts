import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { checkoutCartSchema, formatZodError } from "@/lib/validations"
import { checkoutCart } from "@/lib/cart"
import { recordSaleSettlement } from "@/lib/settlement"
import { logAudit } from "@/lib/audit"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:create")) return forbiddenResponse()

    const body = await request.json()
    const { cartSessionId, ...rest } = body
    const validated = checkoutCartSchema.parse(rest)

    if (!cartSessionId) {
      return NextResponse.json({ error: "cartSessionId is required" }, { status: 400 })
    }

    const orders = await checkoutCart({
      cartSessionId,
      tenantId: session.tenantId,
      branchId: session.branchId,
      staffId: session.staffId,
      type: validated.type,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      customerAddr: validated.customerAddr,
      notes: validated.notes,
    })

    // Record settlement for each vendor order
    for (const order of orders) {
      if (order.vendorId) {
        await recordSaleSettlement({
          tenantId: session.tenantId,
          vendorId: order.vendorId,
          orderId: order.id,
          orderTotal: order.total,
          orderType: order.type,
        })
      }
    }

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "CHECKOUT",
      entity: "Cart",
      entityId: cartSessionId,
      details: `Checkout created ${orders.length} order(s)`,
    })

    return NextResponse.json({ orders, count: orders.length }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : "Checkout failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

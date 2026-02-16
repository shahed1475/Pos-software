import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createPayoutSchema, formatZodError } from "@/lib/validations"
import { createPayout } from "@/lib/settlement"
import { logAudit } from "@/lib/audit"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settlement:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get("vendorId")
    const status = searchParams.get("status")

    const where: any = { tenantId: session.tenantId }
    if (vendorId) where.vendorId = vendorId
    if (status) where.status = status

    const payouts = await prisma.vendorPayout.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(payouts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settlement:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = createPayoutSchema.parse(body)

    const payout = await createPayout({
      tenantId: session.tenantId,
      vendorId: validated.vendorId,
      amount: validated.amount,
      period: validated.period,
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "CREATE_PAYOUT",
      entity: "VendorPayout",
      entityId: payout.id,
      details: `Payout of ${validated.amount} for vendor ${validated.vendorId}`,
    })

    return NextResponse.json(payout, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settlement:manage")) return forbiddenResponse()

    const body = await request.json()
    const { payoutId, status } = body

    if (!payoutId || !["PAID", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const payout = await prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "UPDATE_PAYOUT",
      entity: "VendorPayout",
      entityId: payoutId,
      details: `Payout status changed to ${status}`,
    })

    return NextResponse.json(payout)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 })
  }
}

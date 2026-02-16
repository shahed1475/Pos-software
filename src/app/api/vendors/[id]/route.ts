import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { updateVendorSchema, formatZodError } from "@/lib/validations"
import { logAudit } from "@/lib/audit"
import { ZodError } from "zod"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:read")) return forbiddenResponse()

    const vendor = await prisma.vendor.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        vendorStaff: {
          include: { staff: { select: { id: true, name: true, role: true, email: true, phone: true } } },
        },
        commissionRules: { where: { active: true } },
        rentAgreements: { where: { active: true } },
        _count: {
          select: { menuItems: true, orders: true, vendorStaff: true },
        },
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    return NextResponse.json(vendor)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateVendorSchema.parse(body)

    const vendor = await prisma.vendor.updateMany({
      where: { id: params.id, tenantId: session.tenantId },
      data: validated,
    })

    if (vendor.count === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    const updated = await prisma.vendor.findUnique({ where: { id: params.id } })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "UPDATE",
      entity: "Vendor",
      entityId: params.id,
      details: JSON.stringify(validated),
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:manage")) return forbiddenResponse()

    // Soft delete — set active to false
    const vendor = await prisma.vendor.updateMany({
      where: { id: params.id, tenantId: session.tenantId },
      data: { active: false },
    })

    if (vendor.count === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "DEACTIVATE",
      entity: "Vendor",
      entityId: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 })
  }
}

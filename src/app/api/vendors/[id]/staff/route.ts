import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { vendorStaffSchema, formatZodError } from "@/lib/validations"
import { logAudit } from "@/lib/audit"
import { ZodError } from "zod"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:read")) return forbiddenResponse()

    const vendor = await prisma.vendor.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    })
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

    const vendorStaff = await prisma.vendorStaff.findMany({
      where: { vendorId: params.id },
      include: {
        staff: { select: { id: true, name: true, role: true, email: true, phone: true, active: true } },
      },
    })

    return NextResponse.json(vendorStaff)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendor staff" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = vendorStaffSchema.parse(body)

    const vendor = await prisma.vendor.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    })
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

    const vendorStaff = await prisma.vendorStaff.create({
      data: {
        vendorId: params.id,
        staffId: validated.staffId,
        role: validated.role,
      },
      include: {
        staff: { select: { id: true, name: true, role: true } },
      },
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "ASSIGN_VENDOR_STAFF",
      entity: "VendorStaff",
      entityId: vendorStaff.id,
      details: `Assigned staff ${validated.staffId} to vendor ${params.id} as ${validated.role}`,
    })

    return NextResponse.json(vendorStaff, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : ""
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Staff member already assigned to this vendor" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to assign staff to vendor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:manage")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get("staffId")
    if (!staffId) return NextResponse.json({ error: "staffId required" }, { status: 400 })

    await prisma.vendorStaff.deleteMany({
      where: { vendorId: params.id, staffId },
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "REMOVE_VENDOR_STAFF",
      entity: "VendorStaff",
      details: `Removed staff ${staffId} from vendor ${params.id}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove vendor staff" }, { status: 500 })
  }
}

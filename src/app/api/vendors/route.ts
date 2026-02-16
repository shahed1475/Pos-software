import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createVendorSchema, formatZodError } from "@/lib/validations"
import { logAudit } from "@/lib/audit"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const active = searchParams.get("active")
    const branchId = searchParams.get("branchId")

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId
    if (active === "true") where.active = true
    if (active === "false") where.active = false
    if (branchId) where.branchId = branchId

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: {
          select: {
            menuItems: true,
            orders: true,
            vendorStaff: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(vendors)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:create")) return forbiddenResponse()

    const body = await request.json()
    const validated = createVendorSchema.parse(body)

    const vendor = await prisma.vendor.create({
      data: {
        tenantId: session.tenantId,
        branchId: validated.branchId || session.branchId || null,
        name: validated.name,
        slug: validated.slug,
        description: validated.description,
        logo: validated.logo,
        contactName: validated.contactName,
        contactPhone: validated.contactPhone,
        contactEmail: validated.contactEmail,
        commissionRate: validated.commissionRate || 0,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "CREATE",
      entity: "Vendor",
      entityId: vendor.id,
      details: `Created vendor: ${vendor.name}`,
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : "Failed to create vendor"
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A vendor with this slug already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 })
  }
}

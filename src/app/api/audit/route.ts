import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "audit:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const entity = searchParams.get("entity")
    const staffId = searchParams.get("staffId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = searchParams.get("limit")

    const where: any = {}

    // Tenant-scoped
    if (session.tenantId) where.tenantId = session.tenantId

    if (entity) where.entity = entity
    if (staffId) where.staffId = staffId

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : 100,
    })

    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}

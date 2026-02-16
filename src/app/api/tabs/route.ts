import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { logAudit } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "OPEN"

    const tabs = await prisma.tab.findMany({
      where: { tenantId: session.tenantId, status },
      include: {
        orders: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(tabs)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tabs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "orders:create")) return forbiddenResponse()

    const body = await request.json()
    const { guestName, tableId, autoCloseMinutes } = body

    const tab = await prisma.tab.create({
      data: {
        tenantId: session.tenantId,
        branchId: session.branchId || null,
        tableId: tableId || null,
        guestName: guestName || null,
        autoCloseAt: autoCloseMinutes
          ? new Date(Date.now() + autoCloseMinutes * 60000)
          : null,
      },
    })

    await logAudit({
      tenantId: session.tenantId,
      staffId: session.staffId,
      action: "OPEN_TAB",
      entity: "Tab",
      entityId: tab.id,
      details: `Opened tab for ${guestName || "Guest"}`,
    })

    return NextResponse.json(tab, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create tab" }, { status: 500 })
  }
}

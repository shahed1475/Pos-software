import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settlement:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const type = searchParams.get("type")

    const where: any = { vendorId: params.id, tenantId: session.tenantId }
    if (type) where.type = type

    const [entries, total, balance] = await Promise.all([
      prisma.settlementLedger.findMany({
        where,
        include: {
          order: { select: { id: true, orderNumber: true, total: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.settlementLedger.count({ where }),
      prisma.settlementLedger.aggregate({
        where: { vendorId: params.id },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      entries,
      total,
      balance: balance._sum.amount || 0,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settlement detail" }, { status: 500 })
  }
}

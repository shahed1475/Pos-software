import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const hasPermission = requirePermission(session, "inventory:read")
    if (!hasPermission) {
      return forbiddenResponse()
    }

    const { searchParams } = new URL(req.url)
    const ingredientId = searchParams.get("ingredientId")
    const type = searchParams.get("type")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = searchParams.get("limit")

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    }

    if (ingredientId) {
      where.ingredientId = ingredientId
    }

    if (type) {
      where.type = type
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const take = limit ? Math.min(parseInt(limit, 10), 500) : 50

    const logs = await prisma.inventoryLog.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true },
        },
      },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Inventory logs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch inventory logs" },
      { status: 500 }
    )
  }
}

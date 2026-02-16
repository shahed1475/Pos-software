import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "cart:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const tableId = searchParams.get("tableId")
    const guestToken = searchParams.get("guestToken")

    const where: any = { tenantId: session.tenantId, status: "OPEN" }
    if (tableId) where.tableId = tableId
    if (guestToken) where.guestToken = guestToken

    const carts = await prisma.cartSession.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
            vendor: { select: { id: true, name: true } },
          },
        },
        table: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(carts)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch carts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "cart:manage")) return forbiddenResponse()

    const body = await request.json()

    const cart = await prisma.cartSession.create({
      data: {
        tenantId: session.tenantId,
        branchId: session.branchId || null,
        tableId: body.tableId || null,
        guestToken: body.guestToken || null,
      },
      include: { items: true },
    })

    return NextResponse.json(cart, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create cart" }, { status: 500 })
  }
}

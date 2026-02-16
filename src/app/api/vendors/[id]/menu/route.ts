import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:read")) return forbiddenResponse()

    const vendor = await prisma.vendor.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    })
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const available = searchParams.get("available")

    const where: any = { vendorId: params.id }
    if (categoryId) where.categoryId = categoryId
    if (available === "true") where.available = true

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        variants: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendor menu" }, { status: 500 })
  }
}

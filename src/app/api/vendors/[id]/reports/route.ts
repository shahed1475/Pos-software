import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "reports:read")) return forbiddenResponse()

    const vendor = await prisma.vendor.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    })
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to + "T23:59:59")

    const orderWhere: any = { vendorId: params.id }
    if (from || to) orderWhere.createdAt = dateFilter

    const [orders, totalRevenue, itemCounts] = await Promise.all([
      prisma.order.count({ where: orderWhere }),
      prisma.order.aggregate({
        where: { ...orderWhere, status: { in: ["COMPLETED", "SERVED"] } },
        _sum: { total: true, taxAmount: true, discount: true, serviceCharge: true },
      }),
      prisma.orderItem.groupBy({
        by: ["menuItemId"],
        where: { order: orderWhere },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
    ])

    // Fetch menu item names for top items
    const topItemIds = itemCounts.map((i) => i.menuItemId)
    const topItems = await prisma.menuItem.findMany({
      where: { id: { in: topItemIds } },
      select: { id: true, name: true, price: true },
    })
    const topItemsMap = new Map(topItems.map((i) => [i.id, i]))

    // Settlement balance
    const settlement = await prisma.settlementLedger.aggregate({
      where: { vendorId: params.id },
      _sum: { amount: true },
    })

    return NextResponse.json({
      vendorId: params.id,
      vendorName: vendor.name,
      totalOrders: orders,
      revenue: totalRevenue._sum.total || 0,
      tax: totalRevenue._sum.taxAmount || 0,
      discounts: totalRevenue._sum.discount || 0,
      serviceCharges: totalRevenue._sum.serviceCharge || 0,
      settlementBalance: settlement._sum.amount || 0,
      topItems: itemCounts.map((ic) => ({
        menuItem: topItemsMap.get(ic.menuItemId),
        totalQuantity: ic._sum.quantity,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendor reports" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (session.role !== "SUPER_ADMIN") return forbiddenResponse()

    const [totalTenants, activeTenants, totalOrders, revenueResult, totalStaff] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { active: true } }),
        prisma.order.count(),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { status: { in: ["COMPLETED", "SERVED"] } },
        }),
        prisma.staff.count(),
      ])

    return NextResponse.json({
      totalTenants,
      activeTenants,
      totalOrders,
      totalRevenue: revenueResult._sum.total || 0,
      totalStaff,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch platform stats" }, { status: 500 })
  }
}

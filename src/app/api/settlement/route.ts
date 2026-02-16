import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settlement:read")) return forbiddenResponse()

    const vendors = await prisma.vendor.findMany({
      where: { tenantId: session.tenantId, active: true },
      select: { id: true, name: true, slug: true, commissionRate: true },
    })

    const summaries = await Promise.all(
      vendors.map(async (vendor) => {
        const ledger = await prisma.settlementLedger.aggregate({
          where: { vendorId: vendor.id },
          _sum: { amount: true },
        })

        const sales = await prisma.settlementLedger.aggregate({
          where: { vendorId: vendor.id, type: "SALE" },
          _sum: { amount: true },
          _count: true,
        })

        const commissions = await prisma.settlementLedger.aggregate({
          where: { vendorId: vendor.id, type: "COMMISSION" },
          _sum: { amount: true },
        })

        const payouts = await prisma.vendorPayout.aggregate({
          where: { vendorId: vendor.id, status: "PAID" },
          _sum: { amount: true },
        })

        const pendingPayouts = await prisma.vendorPayout.aggregate({
          where: { vendorId: vendor.id, status: "PENDING" },
          _sum: { amount: true },
        })

        return {
          vendor,
          balance: ledger._sum.amount || 0,
          totalSales: sales._sum.amount || 0,
          salesCount: sales._count || 0,
          totalCommissions: Math.abs(commissions._sum.amount || 0),
          totalPaidOut: payouts._sum.amount || 0,
          pendingPayouts: pendingPayouts._sum.amount || 0,
        }
      })
    )

    return NextResponse.json(summaries)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settlement overview" }, { status: 500 })
  }
}

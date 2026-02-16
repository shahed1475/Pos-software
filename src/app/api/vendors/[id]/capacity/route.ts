import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { checkVendorCapacity } from "@/lib/throttle"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:read")) return forbiddenResponse()

    const [rule, status, recentLogs] = await Promise.all([
      prisma.vendorCapacityRule.findFirst({
        where: { vendorId: params.id, active: true },
      }),
      checkVendorCapacity(params.id),
      prisma.orderThrottleLog.findMany({
        where: { vendorId: params.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ])

    return NextResponse.json({ rule, status, recentLogs })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch capacity" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "vendors:manage")) return forbiddenResponse()

    const body = await request.json()
    const { maxOrdersPerWindow, windowMinutes, maxActiveTickets } = body

    // Upsert capacity rule
    const existing = await prisma.vendorCapacityRule.findFirst({
      where: { vendorId: params.id },
    })

    let rule
    if (existing) {
      rule = await prisma.vendorCapacityRule.update({
        where: { id: existing.id },
        data: {
          maxOrdersPerWindow: maxOrdersPerWindow ?? existing.maxOrdersPerWindow,
          windowMinutes: windowMinutes ?? existing.windowMinutes,
          maxActiveTickets: maxActiveTickets ?? existing.maxActiveTickets,
          active: true,
        },
      })
    } else {
      rule = await prisma.vendorCapacityRule.create({
        data: {
          vendorId: params.id,
          maxOrdersPerWindow: maxOrdersPerWindow || 20,
          windowMinutes: windowMinutes || 30,
          maxActiveTickets: maxActiveTickets || 10,
        },
      })
    }

    return NextResponse.json(rule)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update capacity" }, { status: 500 })
  }
}

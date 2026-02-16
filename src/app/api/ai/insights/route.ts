import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { generateDailyInsight } from "@/lib/ai/insight-generator"
import { checkPlanFeatureAccess } from "@/lib/plan-gating"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "analytics:read")) return forbiddenResponse()
    const access = await checkPlanFeatureAccess(session.tenantId, "ai")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Feature not available in current plan" }, { status: 402 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "10")

    const where: any = { tenantId: session.tenantId }
    if (type) where.type = type

    const insights = await prisma.aIInsight.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: limit,
    })

    return NextResponse.json(insights)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "analytics:aggregate")) return forbiddenResponse()
    const access = await checkPlanFeatureAccess(session.tenantId, "ai")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Feature not available in current plan" }, { status: 402 })
    }

    const body = await request.json()
    const { date } = body

    const insight = await generateDailyInsight({
      tenantId: session.tenantId,
      branchId: session.branchId || undefined,
      date,
    })
    return NextResponse.json(insight, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 })
  }
}

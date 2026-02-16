import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { calculateRFMScores, getChurnRisk, getSegmentSummary } from "@/lib/ai/marketing"
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
    const type = searchParams.get("type") || "segments"

    switch (type) {
      case "rfm":
        return NextResponse.json(await calculateRFMScores(session.tenantId))
      case "churn":
        return NextResponse.json(await getChurnRisk(session.tenantId))
      case "segments":
      default:
        return NextResponse.json(await getSegmentSummary(session.tenantId))
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch marketing data" }, { status: 500 })
  }
}

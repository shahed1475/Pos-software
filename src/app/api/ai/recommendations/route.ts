import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { getFrequentlyBoughtTogether, getTimeBasedRecommendations, getProfitPrioritizedRecommendations } from "@/lib/ai/recommendations"
import { checkPlanFeatureAccess } from "@/lib/plan-gating"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:read")) return forbiddenResponse()
    const access = await checkPlanFeatureAccess(session.tenantId, "ai")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Feature not available in current plan" }, { status: 402 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "time"
    const menuItemId = searchParams.get("menuItemId")
    const vendorId = searchParams.get("vendorId") || undefined
    const limit = parseInt(searchParams.get("limit") || "10")

    switch (type) {
      case "together":
        if (!menuItemId) return NextResponse.json({ error: "menuItemId required" }, { status: 400 })
        return NextResponse.json(await getFrequentlyBoughtTogether({
          menuItemId,
          tenantId: session.tenantId,
          limit,
        }))
      case "time":
        return NextResponse.json(await getTimeBasedRecommendations({
          tenantId: session.tenantId,
          vendorId,
          limit,
        }))
      case "profit":
        return NextResponse.json(await getProfitPrioritizedRecommendations({
          tenantId: session.tenantId,
          vendorId,
          limit,
        }))
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 })
  }
}

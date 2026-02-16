import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { getMenuEngineeringMatrix, getDiscountAnalysis } from "@/lib/ai/profit"
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
    const type = searchParams.get("type") || "matrix"
    const vendorId = searchParams.get("vendorId") || undefined
    const daysBack = parseInt(searchParams.get("days") || "30")

    switch (type) {
      case "matrix":
        return NextResponse.json(await getMenuEngineeringMatrix({
          tenantId: session.tenantId,
          vendorId,
          daysBack,
        }))
      case "discounts":
        return NextResponse.json(await getDiscountAnalysis({
          tenantId: session.tenantId,
          daysBack,
        }))
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profit data" }, { status: 500 })
  }
}

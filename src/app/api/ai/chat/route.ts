import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { processChat } from "@/lib/ai/chat"
import { checkPlanFeatureAccess } from "@/lib/plan-gating"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "analytics:read")) return forbiddenResponse()
    const access = await checkPlanFeatureAccess(session.tenantId, "ai")
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Feature not available in current plan" }, { status: 402 })
    }

    const { message } = await request.json()
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 })
    }

    const response = await processChat(
      { tenantId: session.tenantId, branchId: session.branchId },
      message
    )

    return NextResponse.json({ response })
  } catch (error) {
    return NextResponse.json({ error: "Chat processing failed" }, { status: 500 })
  }
}

import { prisma } from "@/lib/prisma"

type PlanFeature = "ai"

interface PlanAccessResult {
  allowed: boolean
  reason?: string
}

export async function checkPlanFeatureAccess(tenantId: string, feature: PlanFeature): Promise<PlanAccessResult> {
  if (!tenantId) {
    return { allowed: false, reason: "Missing tenant context" }
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  })

  if (!subscription) {
    return { allowed: false, reason: "No active subscription found" }
  }

  if (!["TRIAL", "ACTIVE"].includes(subscription.status)) {
    return { allowed: false, reason: `Subscription status is ${subscription.status}` }
  }

  if (feature === "ai") {
    const plan = await prisma.planConfig.findUnique({
      where: { name: subscription.plan },
      select: { aiEnabled: true, active: true },
    })

    if (!plan || !plan.active) {
      return { allowed: false, reason: "Current plan is unavailable" }
    }

    if (!plan.aiEnabled) {
      return { allowed: false, reason: "AI features are not enabled in this plan" }
    }
  }

  return { allowed: true }
}

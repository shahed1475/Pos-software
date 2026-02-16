import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"

function ensureSuperAdmin(role: string) {
  return role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!ensureSuperAdmin(session.role)) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    const subscriptions = await prisma.subscription.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, active: true, plan: true, maxBranches: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(subscriptions)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!ensureSuperAdmin(session.role)) return forbiddenResponse()

    const body = await request.json()
    const tenantId = String(body.tenantId || "")
    const plan = String(body.plan || "").trim().toLowerCase()
    const status = String(body.status || "ACTIVE").toUpperCase()
    const trialDays = Number(body.trialDays ?? 14)
    const periodDays = Number(body.periodDays ?? 30)

    if (!tenantId || !plan) {
      return NextResponse.json({ error: "tenantId and plan are required" }, { status: 400 })
    }

    const planConfig = await prisma.planConfig.findUnique({ where: { name: plan } })
    if (!planConfig) {
      return NextResponse.json({ error: "Plan does not exist" }, { status: 404 })
    }

    const now = new Date()
    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        plan,
        status,
        trialEndsAt: status === "TRIAL" ? new Date(now.getTime() + trialDays * 86400000) : null,
        currentPeriodEnd: new Date(now.getTime() + periodDays * 86400000),
      },
    })

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        maxBranches: planConfig.maxBranches,
      },
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }
}

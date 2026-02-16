import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"

function ensureSuperAdmin(role: string) {
  return role === "SUPER_ADMIN"
}

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!ensureSuperAdmin(session.role)) return forbiddenResponse()

    const plans = await prisma.planConfig.findMany({
      orderBy: [{ active: "desc" }, { price: "asc" }],
    })
    return NextResponse.json(plans)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!ensureSuperAdmin(session.role)) return forbiddenResponse()

    const body = await request.json()
    const name = String(body.name || "").trim().toLowerCase()
    if (!name) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 })
    }

    const plan = await prisma.planConfig.upsert({
      where: { name },
      update: {
        maxBranches: Number(body.maxBranches ?? 1),
        maxVendors: Number(body.maxVendors ?? 1),
        aiEnabled: Boolean(body.aiEnabled),
        price: Number(body.price ?? 0),
        active: body.active !== false,
      },
      create: {
        name,
        maxBranches: Number(body.maxBranches ?? 1),
        maxVendors: Number(body.maxVendors ?? 1),
        aiEnabled: Boolean(body.aiEnabled),
        price: Number(body.price ?? 0),
        active: body.active !== false,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 })
  }
}

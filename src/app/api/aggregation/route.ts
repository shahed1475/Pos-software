import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { aggregationRequestSchema, formatZodError } from "@/lib/validations"
import { runFullAggregation } from "@/lib/aggregation"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "analytics:aggregate")) return forbiddenResponse()

    const body = await request.json()
    const parsed = aggregationRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 })
    }

    const { dateFrom, dateTo, types } = parsed.data
    const result = await runFullAggregation(
      session.tenantId,
      session.branchId,
      dateFrom,
      dateTo,
      session.staffId,
      types
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Aggregation error:", error)
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "analytics:read")) return forbiddenResponse()

    const jobs = await prisma.aggregationJob.findMany({
      where: {
        tenantId: session.tenantId,
        branchId: session.branchId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("Aggregation jobs error:", error)
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  }
}

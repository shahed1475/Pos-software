import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runFullAggregation } from "@/lib/aggregation"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get yesterday's date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split("T")[0]

    // Get all active tenants with branches
    const tenants = await prisma.tenant.findMany({
      where: { active: true },
      include: {
        branches: {
          where: { active: true },
        },
      },
    })

    const results: { tenantId: string; branchId: string; status: string }[] = []

    for (const tenant of tenants) {
      for (const branch of tenant.branches) {
        const result = await runFullAggregation(
          tenant.id,
          branch.id,
          dateStr,
          dateStr,
          "cron"
        )
        results.push({
          tenantId: tenant.id,
          branchId: branch.id,
          status: result.status,
        })
      }
    }

    return NextResponse.json({
      date: dateStr,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Cron aggregation error:", error)
    return NextResponse.json({ error: "Cron aggregation failed" }, { status: 500 })
  }
}

import { prisma } from "@/lib/prisma"
import { aggregateDailySales } from "./daily-sales"
import { aggregateHourlySales } from "./hourly-sales"
import { aggregateInventory } from "./inventory-summary"

export type AggregationType = "daily-sales" | "hourly-sales" | "inventory"

export async function runFullAggregation(
  tenantId: string,
  branchId: string,
  dateFrom: string,
  dateTo: string,
  triggeredBy: string,
  types?: AggregationType[]
) {
  const jobType = types ? types.join(",") : "full"

  const job = await prisma.aggregationJob.create({
    data: {
      tenantId,
      branchId,
      type: jobType,
      dateFrom,
      dateTo,
      status: "RUNNING",
      triggeredBy,
      startedAt: new Date(),
    },
  })

  try {
    const toRun = types || ["daily-sales", "hourly-sales", "inventory"]

    if (toRun.includes("daily-sales")) {
      await aggregateDailySales(tenantId, branchId, dateFrom, dateTo)
    }
    if (toRun.includes("hourly-sales")) {
      await aggregateHourlySales(tenantId, branchId, dateFrom, dateTo)
    }
    if (toRun.includes("inventory")) {
      await aggregateInventory(tenantId, branchId, dateFrom, dateTo)
    }

    await prisma.aggregationJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    })

    return { jobId: job.id, status: "COMPLETED" }
  } catch (error: any) {
    await prisma.aggregationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        error: error.message || "Unknown error",
        completedAt: new Date(),
      },
    })

    return { jobId: job.id, status: "FAILED", error: error.message }
  }
}

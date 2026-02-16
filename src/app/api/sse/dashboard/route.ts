import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const user = session.user as any
  const tenantId: string = user.tenantId || ""
  const branchId: string = user.branchId || ""

  const encoder = new TextEncoder()
  const abortController = new AbortController()

  request.signal.addEventListener("abort", () => {
    abortController.abort()
  })

  const stream = new ReadableStream({
    async start(controller) {
      const sendStats = async () => {
        try {
          const tenantFilter: any = {}
          if (tenantId) tenantFilter.tenantId = tenantId
          if (branchId) tenantFilter.branchId = branchId

          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)

          const todayOrders = await prisma.order.findMany({
            where: {
              ...tenantFilter,
              createdAt: { gte: todayStart },
              status: { not: "CANCELLED" },
            },
          })

          const todayRevenue = todayOrders
            .filter((o) => o.status === "COMPLETED")
            .reduce((sum, o) => sum + o.total, 0)

          const activeOrders = await prisma.order.count({
            where: {
              ...tenantFilter,
              status: { in: ["NEW", "PREPARING", "READY", "SERVED"] },
            },
          })

          const tableFilter: any = {}
          if (branchId) tableFilter.branchId = branchId
          else if (tenantId) tableFilter.tenantId = tenantId

          const tables = await prisma.table.findMany({ where: tableFilter })
          const tablesOccupied = tables.filter((t) => t.status === "OCCUPIED").length

          const stats = {
            todayRevenue,
            todayOrders: todayOrders.length,
            activeOrders,
            tablesOccupied,
            totalTables: tables.length,
          }

          const data = `data: ${JSON.stringify(stats)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error("SSE dashboard error:", error)
          const errorData = `data: ${JSON.stringify({ error: "Failed to fetch dashboard stats" })}\n\n`
          controller.enqueue(encoder.encode(errorData))
        }
      }

      // Send initial data immediately
      await sendStats()

      // Poll every 3 seconds
      const interval = setInterval(async () => {
        if (abortController.signal.aborted) {
          clearInterval(interval)
          controller.close()
          return
        }
        await sendStats()
      }, 3000)

      // Clean up on abort
      abortController.signal.addEventListener("abort", () => {
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // Stream may already be closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

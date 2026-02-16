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
      const sendOrders = async () => {
        try {
          const where: any = {
            status: { in: ["NEW", "PREPARING", "READY", "SERVED"] },
          }
          if (tenantId) where.tenantId = tenantId
          if (branchId) where.branchId = branchId

          const orders = await prisma.order.findMany({
            where,
            include: {
              items: { include: { menuItem: true } },
              table: true,
              staff: { select: { id: true, name: true } },
              payments: true,
            },
            orderBy: { createdAt: "desc" },
          })

          const data = `data: ${JSON.stringify(orders)}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error("SSE orders error:", error)
          const errorData = `data: ${JSON.stringify({ error: "Failed to fetch orders" })}\n\n`
          controller.enqueue(encoder.encode(errorData))
        }
      }

      // Send initial data immediately
      await sendOrders()

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        if (abortController.signal.aborted) {
          clearInterval(interval)
          controller.close()
          return
        }
        await sendOrders()
      }, 2000)

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

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createPaymentSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "billing:create")) return forbiddenResponse()

    const body = await request.json()
    const validated = createPaymentSchema.parse(body)

    const payment = await prisma.payment.create({
      data: {
        orderId: validated.orderId,
        method: validated.method,
        amount: validated.amount,
      },
    })

    // Check if full payment received
    const order = await prisma.order.findUnique({
      where: { id: validated.orderId },
      include: { payments: true },
    })

    if (order) {
      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0)
      if (totalPaid >= order.total) {
        await prisma.order.update({
          where: { id: validated.orderId },
          data: { status: "COMPLETED", completedAt: new Date() },
        })

        // Free up table
        if (order.tableId) {
          const otherActive = await prisma.order.count({
            where: {
              tableId: order.tableId,
              id: { not: validated.orderId },
              status: { in: ["NEW", "PREPARING", "READY", "SERVED"] },
            },
          })
          if (otherActive === 0) {
            await prisma.table.update({
              where: { id: order.tableId },
              data: { status: "AVAILABLE" },
            })
          }
        }
      }
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    console.error("Payment error:", error)
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "billing:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")

    if (orderId) {
      const payments = await prisma.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json(payments)
    }

    const payments = await prisma.payment.findMany({
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json(payments)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

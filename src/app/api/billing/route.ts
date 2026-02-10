import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, method, amount } = body

    if (!orderId || !method || amount === undefined) {
      return NextResponse.json({ error: "orderId, method, and amount are required" }, { status: 400 })
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        method,
        amount: parseFloat(amount),
      },
    })

    // Check if full payment received
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    })

    if (order) {
      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0)
      if (totalPaid >= order.total) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "COMPLETED", completedAt: new Date() },
        })

        // Free up table
        if (order.tableId) {
          const otherActive = await prisma.order.count({
            where: {
              tableId: order.tableId,
              id: { not: orderId },
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
    console.error("Payment error:", error)
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
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

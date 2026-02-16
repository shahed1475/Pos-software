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

    const invoices = await prisma.invoice.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return NextResponse.json(invoices)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!ensureSuperAdmin(session.role)) return forbiddenResponse()

    const body = await request.json()
    const tenantId = String(body.tenantId || "")
    const amount = Number(body.amount)
    const status = String(body.status || "PENDING").toUpperCase()
    const dueDate = body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 7 * 86400000)
    const note = body.note ? String(body.note) : null

    if (!tenantId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "tenantId and valid amount are required" }, { status: 400 })
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        amount,
        status,
        dueDate,
        note,
        paidAt: status === "PAID" ? new Date() : null,
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!ensureSuperAdmin(session.role)) return forbiddenResponse()

    const body = await request.json()
    const id = String(body.id || "")
    const status = String(body.status || "").toUpperCase()
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 })
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : null,
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }
}

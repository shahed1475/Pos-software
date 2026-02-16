import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { ZodError } from "zod"
import { createExpenseSchema, formatZodError } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "expenses:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const category = searchParams.get("category")

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId

    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }

    if (category) where.category = category

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        staff: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "expenses:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = createExpenseSchema.parse(body)

    const expense = await prisma.expense.create({
      data: {
        category: validated.category,
        amount: validated.amount,
        date: validated.date,
        notes: validated.notes,
        staffId: validated.staffId,
        ...(session.tenantId && { tenantId: session.tenantId }),
        ...(session.branchId && { branchId: session.branchId }),
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "expenses:manage")) return forbiddenResponse()

    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    // Verify tenant ownership
    if (session.tenantId) {
      const existing = await prisma.expense.findFirst({
        where: { id, tenantId: session.tenantId },
      })
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(data.category && { category: data.category }),
        ...(data.amount !== undefined && { amount: parseFloat(String(data.amount)) }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.staffId !== undefined && { staffId: data.staffId }),
      },
      include: {
        staff: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "expenses:manage")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    // Verify tenant ownership
    if (session.tenantId) {
      const existing = await prisma.expense.findFirst({
        where: { id, tenantId: session.tenantId },
      })
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
  }
}

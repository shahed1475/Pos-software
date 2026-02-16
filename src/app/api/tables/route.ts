import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createTableSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "tables:read")) return forbiddenResponse()

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId
    if (session.branchId) where.branchId = session.branchId

    const tables = await prisma.table.findMany({
      where,
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: { status: { in: ["NEW", "PREPARING", "READY", "SERVED"] } },
          select: { id: true, orderNumber: true, status: true, total: true },
        },
      },
    })
    return NextResponse.json(tables)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "tables:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = createTableSchema.parse(body)

    const table = await prisma.table.create({
      data: {
        number: validated.number,
        capacity: validated.capacity || 4,
        posX: validated.posX,
        posY: validated.posY,
        ...(session.tenantId && { tenantId: session.tenantId }),
        ...(session.branchId && { branchId: session.branchId }),
      },
    })
    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 })
  }
}

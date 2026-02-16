import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { updateTableSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "tables:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateTableSchema.parse(body)

    const table = await prisma.table.update({
      where: { id: params.id },
      data: {
        number: validated.number,
        capacity: validated.capacity,
        status: validated.status,
        posX: validated.posX,
        posY: validated.posY,
      },
    })
    return NextResponse.json(table)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "tables:manage")) return forbiddenResponse()

    await prisma.table.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete table" }, { status: 500 })
  }
}

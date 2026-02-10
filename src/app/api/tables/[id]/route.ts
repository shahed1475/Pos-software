import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const table = await prisma.table.update({
      where: { id: params.id },
      data: {
        number: body.number !== undefined ? parseInt(body.number) : undefined,
        capacity: body.capacity !== undefined ? parseInt(body.capacity) : undefined,
        status: body.status,
        posX: body.posX,
        posY: body.posY,
      },
    })
    return NextResponse.json(table)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.table.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete table" }, { status: 500 })
  }
}

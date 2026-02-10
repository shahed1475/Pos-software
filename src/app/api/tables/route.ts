import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
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
    const body = await request.json()
    const table = await prisma.table.create({
      data: {
        number: parseInt(body.number),
        capacity: parseInt(body.capacity) || 4,
        posX: body.posX || 0,
        posY: body.posY || 0,
      },
    })
    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 })
  }
}

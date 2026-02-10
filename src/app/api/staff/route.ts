import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        active: true,
        createdAt: true,
        _count: { select: { orders: true, shifts: true } },
      },
    })
    return NextResponse.json(staff)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.pin) {
      return NextResponse.json({ error: "Name and PIN required" }, { status: 400 })
    }

    if (body.pin.length < 4 || body.pin.length > 6) {
      return NextResponse.json({ error: "PIN must be 4-6 digits" }, { status: 400 })
    }

    const hashedPin = await bcrypt.hash(body.pin, 10)

    const staff = await prisma.staff.create({
      data: {
        name: body.name,
        pin: hashedPin,
        role: body.role || "CASHIER",
        phone: body.phone,
        email: body.email,
        active: body.active ?? true,
      },
    })

    return NextResponse.json({
      id: staff.id,
      name: staff.name,
      role: staff.role,
      phone: staff.phone,
      email: staff.email,
      active: staff.active,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const updateData: any = {}

    if (body.name) updateData.name = body.name
    if (body.role) updateData.role = body.role
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.email !== undefined) updateData.email = body.email
    if (body.active !== undefined) updateData.active = body.active
    if (body.pin) {
      updateData.pin = await bcrypt.hash(body.pin, 10)
    }

    const staff = await prisma.staff.update({
      where: { id: body.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        active: true,
      },
    })

    return NextResponse.json(staff)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    // Soft delete by deactivating
    await prisma.staff.update({
      where: { id },
      data: { active: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 })
  }
}

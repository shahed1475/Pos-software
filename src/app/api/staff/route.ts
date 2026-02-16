import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createStaffSchema, updateStaffSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "staff:read")) return forbiddenResponse()

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId

    const staff = await prisma.staff.findMany({
      where,
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
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "staff:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = createStaffSchema.parse(body)

    const hashedPin = await bcrypt.hash(validated.pin, 10)

    const staff = await prisma.staff.create({
      data: {
        name: validated.name,
        pin: hashedPin,
        role: validated.role,
        phone: validated.phone,
        email: validated.email,
        active: validated.active,
        ...(session.tenantId && { tenantId: session.tenantId }),
        ...(session.branchId && { branchId: session.branchId }),
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
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "staff:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateStaffSchema.parse(body)

    const updateData: any = {}
    if (validated.name) updateData.name = validated.name
    if (validated.role) updateData.role = validated.role
    if (validated.phone !== undefined) updateData.phone = validated.phone
    if (validated.email !== undefined) updateData.email = validated.email
    if (validated.active !== undefined) updateData.active = validated.active
    if (validated.pin) {
      updateData.pin = await bcrypt.hash(validated.pin, 10)
    }

    const staff = await prisma.staff.update({
      where: { id: validated.id },
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
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "staff:manage")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    await prisma.staff.update({
      where: { id },
      data: { active: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 })
  }
}

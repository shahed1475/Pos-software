import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createCategorySchema, updateCategorySchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "categories:read")) return forbiddenResponse()

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId

    const categories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    })
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "categories:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = createCategorySchema.parse(body)

    const category = await prisma.category.create({
      data: {
        name: validated.name,
        sortOrder: validated.sortOrder,
        active: validated.active,
        ...(session.tenantId && { tenantId: session.tenantId }),
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "categories:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateCategorySchema.parse(body)

    const category = await prisma.category.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        sortOrder: validated.sortOrder,
        active: validated.active,
      },
    })
    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "categories:manage")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    if (session.tenantId) {
      const cat = await prisma.category.findFirst({ where: { id, tenantId: session.tenantId } })
      if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
  }
}

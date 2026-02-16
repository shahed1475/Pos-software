import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { updateMenuItemSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:read")) return forbiddenResponse()

    const where: any = { id: params.id }
    if (session.tenantId) where.tenantId = session.tenantId

    const item = await prisma.menuItem.findFirst({
      where,
      include: { category: true, variants: true, ingredients: { include: { ingredient: true } } },
    })
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:update")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateMenuItemSchema.parse(body)

    // Delete existing variants and recreate
    if (validated.variants !== undefined) {
      await prisma.menuVariant.deleteMany({ where: { menuItemId: params.id } })
    }

    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        image: validated.image,
        categoryId: validated.categoryId,
        available: validated.available,
        variants: validated.variants?.length
          ? {
              create: validated.variants.map((v) => ({
                name: v.name,
                priceAdj: v.priceAdj || 0,
              })),
            }
          : undefined,
      },
      include: { category: true, variants: true },
    })
    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:delete")) return forbiddenResponse()

    // Verify tenant ownership
    if (session.tenantId) {
      const item = await prisma.menuItem.findFirst({
        where: { id: params.id, tenantId: session.tenantId },
      })
      if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.menuItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}

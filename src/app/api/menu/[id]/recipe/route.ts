import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { ZodError } from "zod"
import { updateRecipeSchema, formatZodError } from "@/lib/validations"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:read")) return forbiddenResponse()

    // Verify menu item exists and belongs to tenant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: params.id,
        ...(session.tenantId && { tenantId: session.tenantId }),
      },
    })
    if (!menuItem) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const ingredients = await prisma.itemIngredient.findMany({
      where: { menuItemId: params.id },
      include: { ingredient: true },
    })

    return NextResponse.json(ingredients)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 })
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

    // Verify menu item exists and belongs to tenant
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        id: params.id,
        ...(session.tenantId && { tenantId: session.tenantId }),
      },
    })
    if (!menuItem) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await request.json()
    const validated = updateRecipeSchema.parse(body)

    // Delete existing recipe ingredients and create new ones
    await prisma.itemIngredient.deleteMany({ where: { menuItemId: params.id } })

    const created = await Promise.all(
      validated.ingredients.map((ing) =>
        prisma.itemIngredient.create({
          data: {
            menuItemId: params.id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
          },
          include: { ingredient: true },
        })
      )
    )

    return NextResponse.json(created)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
  }
}

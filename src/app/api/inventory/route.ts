import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createIngredientSchema, purchaseSchema, updateIngredientSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "inventory:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get("lowStock")

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId

    const ingredients = await prisma.ingredient.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    })

    const result = lowStock === "true"
      ? ingredients.filter((i) => i.stock <= i.minStock)
      : ingredients

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "inventory:manage")) return forbiddenResponse()

    const body = await request.json()

    if (body.type === "purchase") {
      const validated = purchaseSchema.parse(body)
      const purchase = await prisma.purchase.create({
        data: {
          ingredientId: validated.ingredientId,
          quantity: validated.quantity,
          totalCost: validated.totalCost,
          supplier: validated.supplier,
          note: validated.note,
          ...(session.tenantId && { tenantId: session.tenantId }),
          ...(session.branchId && { branchId: session.branchId }),
        },
      })

      await prisma.ingredient.update({
        where: { id: validated.ingredientId },
        data: {
          stock: { increment: validated.quantity },
        },
      })

      return NextResponse.json(purchase, { status: 201 })
    }

    const validated = createIngredientSchema.parse(body)
    const ingredient = await prisma.ingredient.create({
      data: {
        name: validated.name,
        unit: validated.unit,
        stock: validated.stock || 0,
        minStock: validated.minStock || 0,
        costPerUnit: validated.costPerUnit || 0,
        ...(session.tenantId && { tenantId: session.tenantId }),
      },
    })
    return NextResponse.json(ingredient, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "inventory:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateIngredientSchema.parse(body)

    const ingredient = await prisma.ingredient.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        unit: validated.unit,
        stock: validated.stock,
        minStock: validated.minStock,
        costPerUnit: validated.costPerUnit,
      },
    })
    return NextResponse.json(ingredient)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "inventory:manage")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

    await prisma.ingredient.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}

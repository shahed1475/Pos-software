import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get("lowStock")

    let where: any = {}
    if (lowStock === "true") {
      // Get ingredients where stock <= minStock
      where = {
        stock: { lte: prisma.ingredient.fields.minStock },
      }
    }

    const ingredients = await prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { items: true } },
      },
    })

    // Filter low stock manually since Prisma doesn't support field comparison easily
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
    const body = await request.json()

    if (body.type === "purchase") {
      // Record a purchase and update stock
      const purchase = await prisma.purchase.create({
        data: {
          ingredientId: body.ingredientId,
          quantity: parseFloat(body.quantity),
          totalCost: parseFloat(body.totalCost),
          supplier: body.supplier,
          note: body.note,
        },
      })

      await prisma.ingredient.update({
        where: { id: body.ingredientId },
        data: {
          stock: { increment: parseFloat(body.quantity) },
        },
      })

      return NextResponse.json(purchase, { status: 201 })
    }

    // Create new ingredient
    const ingredient = await prisma.ingredient.create({
      data: {
        name: body.name,
        unit: body.unit,
        stock: parseFloat(body.stock) || 0,
        minStock: parseFloat(body.minStock) || 0,
        costPerUnit: parseFloat(body.costPerUnit) || 0,
      },
    })
    return NextResponse.json(ingredient, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const ingredient = await prisma.ingredient.update({
      where: { id: body.id },
      data: {
        name: body.name,
        unit: body.unit,
        stock: body.stock !== undefined ? parseFloat(body.stock) : undefined,
        minStock: body.minStock !== undefined ? parseFloat(body.minStock) : undefined,
        costPerUnit: body.costPerUnit !== undefined ? parseFloat(body.costPerUnit) : undefined,
      },
    })
    return NextResponse.json(ingredient)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })
    await prisma.ingredient.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}

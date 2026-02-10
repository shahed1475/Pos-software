import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: params.id },
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
    const body = await request.json()

    // Delete existing variants and recreate
    if (body.variants !== undefined) {
      await prisma.menuVariant.deleteMany({ where: { menuItemId: params.id } })
    }

    const item = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        image: body.image,
        categoryId: body.categoryId,
        available: body.available,
        variants: body.variants?.length
          ? {
              create: body.variants.map((v: any) => ({
                name: v.name,
                priceAdj: parseFloat(v.priceAdj) || 0,
              })),
            }
          : undefined,
      },
      include: { category: true, variants: true },
    })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.menuItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
  }
}

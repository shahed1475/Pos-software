import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const available = searchParams.get("available")

    const where: any = {}
    if (categoryId) where.categoryId = categoryId
    if (available === "true") where.available = true

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        variants: true,
      },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await prisma.menuItem.create({
      data: {
        name: body.name,
        description: body.description,
        price: parseFloat(body.price),
        image: body.image,
        categoryId: body.categoryId,
        available: body.available ?? true,
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
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 })
  }
}

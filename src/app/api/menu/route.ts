import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createMenuItemSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:read")) return forbiddenResponse()

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const available = searchParams.get("available")

    const where: any = {}
    if (session.tenantId) where.tenantId = session.tenantId
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
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "menu:create")) return forbiddenResponse()

    const body = await request.json()
    const validated = createMenuItemSchema.parse(body)

    const item = await prisma.menuItem.create({
      data: {
        name: validated.name,
        description: validated.description,
        price: validated.price,
        image: validated.image,
        categoryId: validated.categoryId,
        available: validated.available,
        ...(session.tenantId && { tenantId: session.tenantId }),
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
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 })
  }
}

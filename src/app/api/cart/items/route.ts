import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { addCartItemSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "cart:manage")) return forbiddenResponse()

    const body = await request.json()
    const { cartSessionId, ...itemData } = body
    const validated = addCartItemSchema.parse(itemData)

    // Verify cart exists and is open
    const cart = await prisma.cartSession.findFirst({
      where: { id: cartSessionId, tenantId: session.tenantId, status: "OPEN" },
    })
    if (!cart) return NextResponse.json({ error: "Cart not found or closed" }, { status: 404 })

    // Get menu item details (including vendor)
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: validated.menuItemId },
      select: { id: true, price: true, vendorId: true, available: true },
    })
    if (!menuItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 })
    if (!menuItem.available) return NextResponse.json({ error: "Menu item not available" }, { status: 400 })

    const cartItem = await prisma.cartItem.create({
      data: {
        cartSessionId,
        vendorId: menuItem.vendorId,
        menuItemId: validated.menuItemId,
        quantity: validated.quantity,
        unitPrice: menuItem.price,
        variant: validated.variant,
        notes: validated.notes,
      },
      include: {
        menuItem: { select: { id: true, name: true, price: true } },
        vendor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(cartItem, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to add cart item" }, { status: 500 })
  }
}

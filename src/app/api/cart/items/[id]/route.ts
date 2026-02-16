import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { updateCartItemSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "cart:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateCartItemSchema.parse(body)

    // If quantity is 0, delete the item
    if (validated.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: params.id } })
      return NextResponse.json({ success: true, deleted: true })
    }

    const item = await prisma.cartItem.update({
      where: { id: params.id },
      data: { quantity: validated.quantity },
      include: {
        menuItem: { select: { id: true, name: true, price: true } },
        vendor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update cart item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "cart:manage")) return forbiddenResponse()

    await prisma.cartItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete cart item" }, { status: 500 })
  }
}

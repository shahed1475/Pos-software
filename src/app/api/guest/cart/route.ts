import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Public guest cart — no auth, uses guestToken
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestToken = searchParams.get("token")

    if (!guestToken) {
      return NextResponse.json({ error: "Guest token required" }, { status: 400 })
    }

    const cart = await prisma.cartSession.findFirst({
      where: { guestToken, status: "OPEN" },
      include: {
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!cart) {
      return NextResponse.json({ items: [], total: 0 })
    }

    const total = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    return NextResponse.json({ ...cart, total })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantSlug, tableNumber, action, guestToken: existingToken, menuItemId, quantity, variant, notes } = body

    if (!tenantSlug) {
      return NextResponse.json({ error: "tenantSlug required" }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { branches: { where: { active: true }, take: 1 } },
    })
    if (!tenant) return NextResponse.json({ error: "Venue not found" }, { status: 404 })

    const branchId = tenant.branches[0]?.id || null

    // Find or create cart
    let guestToken = existingToken
    let cart: any = null

    if (guestToken) {
      cart = await prisma.cartSession.findFirst({
        where: { guestToken, status: "OPEN" },
      })
    }

    if (!cart) {
      guestToken = crypto.randomUUID()
      // Find table if provided
      let tableId: string | null = null
      if (tableNumber && branchId) {
        const table = await prisma.table.findFirst({
          where: { branchId, number: parseInt(tableNumber) },
        })
        tableId = table?.id || null
      }

      cart = await prisma.cartSession.create({
        data: {
          tenantId: tenant.id,
          branchId,
          tableId,
          guestToken,
        },
      })
    }

    // Add item
    if (action === "add" && menuItemId) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: menuItemId },
        select: { id: true, price: true, vendorId: true, available: true },
      })
      if (!menuItem || !menuItem.available) {
        return NextResponse.json({ error: "Item not available" }, { status: 400 })
      }

      await prisma.cartItem.create({
        data: {
          cartSessionId: cart.id,
          vendorId: menuItem.vendorId,
          menuItemId,
          quantity: quantity || 1,
          unitPrice: menuItem.price,
          variant: variant || null,
          notes: notes || null,
        },
      })
    }

    // Remove item
    if (action === "remove" && body.cartItemId) {
      await prisma.cartItem.delete({ where: { id: body.cartItemId } })
    }

    // Update quantity
    if (action === "update" && body.cartItemId) {
      if (quantity === 0) {
        await prisma.cartItem.delete({ where: { id: body.cartItemId } })
      } else {
        await prisma.cartItem.update({
          where: { id: body.cartItemId },
          data: { quantity },
        })
      }
    }

    // Return updated cart
    const updatedCart = await prisma.cartSession.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, image: true } },
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    })

    const total = updatedCart?.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) || 0
    return NextResponse.json({ ...updatedCart, guestToken, total })
  } catch (error) {
    console.error("Guest cart error:", error)
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 })
  }
}

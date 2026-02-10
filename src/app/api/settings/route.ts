import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const restaurant = await prisma.restaurant.findFirst()
    if (!restaurant) {
      return NextResponse.json({
        name: "FluxPOS",
        taxRate: 10,
        currency: "USD",
      })
    }
    return NextResponse.json(restaurant)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    let restaurant = await prisma.restaurant.findFirst()

    if (restaurant) {
      restaurant = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          name: body.name,
          address: body.address,
          phone: body.phone,
          email: body.email,
          taxRate: body.taxRate !== undefined ? parseFloat(body.taxRate) : undefined,
          currency: body.currency,
        },
      })
    } else {
      restaurant = await prisma.restaurant.create({
        data: {
          name: body.name || "FluxPOS",
          address: body.address,
          phone: body.phone,
          email: body.email,
          taxRate: parseFloat(body.taxRate) || 10,
          currency: body.currency || "USD",
        },
      })
    }

    return NextResponse.json(restaurant)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

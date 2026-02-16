import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { createWasteSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const hasPermission = requirePermission(session, "inventory:manage")
    if (!hasPermission) {
      return forbiddenResponse()
    }

    const { searchParams } = new URL(req.url)
    const ingredientId = searchParams.get("ingredientId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = searchParams.get("limit")

    const where: Record<string, unknown> = {
      tenantId: session.user.tenantId,
    }

    if (ingredientId) {
      where.ingredientId = ingredientId
    }

    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const take = limit ? Math.min(parseInt(limit, 10), 500) : 50

    const wasteEntries = await prisma.wasteEntry.findMany({
      where,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        ingredient: {
          select: { id: true, name: true, unit: true },
        },
      },
    })

    return NextResponse.json({ wasteEntries })
  } catch (error) {
    console.error("Waste list error:", error)
    return NextResponse.json(
      { error: "Failed to fetch waste entries" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const hasPermission = requirePermission(session, "inventory:manage")
    if (!hasPermission) {
      return forbiddenResponse()
    }

    const body = await req.json()
    const data = createWasteSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Deduct from ingredient stock
      const ingredient = await tx.ingredient.update({
        where: {
          id: data.ingredientId,
          tenantId: session.user.tenantId,
        },
        data: {
          stock: {
            decrement: data.quantity,
          },
        },
      })

      // Create waste entry
      const wasteEntry = await tx.wasteEntry.create({
        data: {
          ingredientId: data.ingredientId,
          quantity: data.quantity,
          reason: data.reason,
          tenantId: session.user.tenantId,
          recordedById: session.user.id,
        },
      })

      // Create inventory log
      await tx.inventoryLog.create({
        data: {
          ingredientId: data.ingredientId,
          type: "WASTE",
          quantity: -data.quantity,
          previousStock: ingredient.stock + data.quantity,
          newStock: ingredient.stock,
          tenantId: session.user.tenantId,
          userId: session.user.id,
          reference: `waste:${wasteEntry.id}`,
        },
      })

      return wasteEntry
    })

    return NextResponse.json({ wasteEntry: result }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Waste creation error:", error)
    return NextResponse.json(
      { error: "Failed to create waste entry" },
      { status: 500 }
    )
  }
}

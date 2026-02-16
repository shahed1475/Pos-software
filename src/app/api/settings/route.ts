import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { updateSettingsSchema, formatZodError } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settings:read")) return forbiddenResponse()

    // If multi-tenant, read from branch
    if (session.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: session.branchId },
        include: { tenant: true },
      })
      if (branch) {
        return NextResponse.json({
          id: branch.id,
          name: branch.tenant.name,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          taxRate: branch.taxRate,
          currency: branch.currency,
          branchName: branch.name,
        })
      }
    }

    // Fallback to restaurant model for backwards compatibility
    const restaurant = await (prisma as any).restaurant?.findFirst?.()
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
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (!requirePermission(session.role, "settings:manage")) return forbiddenResponse()

    const body = await request.json()
    const validated = updateSettingsSchema.parse(body)

    // If multi-tenant, update branch
    if (session.branchId) {
      const branch = await prisma.branch.update({
        where: { id: session.branchId },
        data: {
          address: validated.address,
          phone: validated.phone,
          email: validated.email,
          taxRate: validated.taxRate,
          currency: validated.currency,
        },
      })
      // Update tenant name if provided
      if (validated.name) {
        const branchData = await prisma.branch.findUnique({
          where: { id: session.branchId },
          select: { tenantId: true },
        })
        if (branchData) {
          await prisma.tenant.update({
            where: { id: branchData.tenantId },
            data: { name: validated.name },
          })
        }
      }
      return NextResponse.json(branch)
    }

    // Fallback to restaurant model
    let restaurant = await (prisma as any).restaurant?.findFirst?.()

    if (restaurant) {
      restaurant = await (prisma as any).restaurant.update({
        where: { id: restaurant.id },
        data: {
          name: validated.name,
          address: validated.address,
          phone: validated.phone,
          email: validated.email,
          taxRate: validated.taxRate,
          currency: validated.currency,
        },
      })
    } else {
      restaurant = await (prisma as any).restaurant?.create?.({
        data: {
          name: validated.name || "FluxPOS",
          address: validated.address,
          phone: validated.phone,
          email: validated.email,
          taxRate: validated.taxRate || 10,
          currency: validated.currency || "USD",
        },
      })
    }

    return NextResponse.json(restaurant)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: formatZodError(error) }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

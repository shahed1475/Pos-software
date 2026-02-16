import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"
import { requirePermission } from "@/lib/permissions"
import { validateStock } from "@/lib/inventory"

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const hasPermission = requirePermission(session, "orders:read")
    if (!hasPermission) {
      return forbiddenResponse()
    }

    const body = await req.json()
    const { menuItemIds } = body

    if (!menuItemIds || !Array.isArray(menuItemIds) || menuItemIds.length === 0) {
      return NextResponse.json(
        { error: "menuItemIds must be a non-empty array" },
        { status: 400 }
      )
    }

    const warnings = await validateStock(menuItemIds)

    return NextResponse.json({ warnings })
  } catch (error) {
    console.error("Inventory check error:", error)
    return NextResponse.json(
      { error: "Failed to check inventory" },
      { status: 500 }
    )
  }
}

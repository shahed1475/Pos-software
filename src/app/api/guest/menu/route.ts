import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public endpoint — no auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")
    const vendorSlug = searchParams.get("vendor")
    const categoryId = searchParams.get("categoryId")

    if (!tenantSlug) {
      return NextResponse.json({ error: "tenant parameter required" }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })
    if (!tenant || !tenant.active) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 })
    }

    const where: any = { tenantId: tenant.id, available: true }

    if (vendorSlug) {
      const vendor = await prisma.vendor.findFirst({
        where: { tenantId: tenant.id, slug: vendorSlug, active: true },
      })
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
      }
      where.vendorId = vendor.id
    }

    if (categoryId) where.categoryId = categoryId

    const [items, categories, vendors] = await Promise.all([
      prisma.menuItem.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          variants: true,
          vendor: { select: { id: true, name: true, slug: true, logo: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        where: { tenantId: tenant.id, active: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.vendor.findMany({
        where: { tenantId: tenant.id, active: true },
        select: { id: true, name: true, slug: true, logo: true, description: true },
        orderBy: { name: "asc" },
      }),
    ])

    return NextResponse.json({
      tenant: { name: tenant.name, slug: tenant.slug, logo: tenant.logo },
      vendors,
      categories,
      items,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 })
  }
}

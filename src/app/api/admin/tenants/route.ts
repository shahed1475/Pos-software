import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorizedResponse, forbiddenResponse } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (session.role !== "SUPER_ADMIN") return forbiddenResponse()

    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            branches: true,
            staff: true,
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(tenants)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (session.role !== "SUPER_ADMIN") return forbiddenResponse()

    const body = await request.json()
    const { name, slug, email, phone, plan } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    // Check for duplicate slug
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 })
    }

    // Create tenant with first branch
    const chosenPlan = (plan || "basic").toLowerCase()
    const planConfig = await prisma.planConfig.findUnique({ where: { name: chosenPlan } })

    const tenant = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          email: email || null,
          phone: phone || null,
          plan: chosenPlan,
          maxBranches: planConfig?.maxBranches || 3,
          branches: {
            create: {
              name: `${name} - Main Branch`,
            },
          },
        },
        include: {
          branches: true,
          _count: {
            select: {
              branches: true,
              staff: true,
              orders: true,
            },
          },
        },
      })

      await tx.subscription.create({
        data: {
          tenantId: createdTenant.id,
          plan: chosenPlan,
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 86400000),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        },
      })

      return createdTenant
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error("Tenant creation error:", error)
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()
    if (session.role !== "SUPER_ADMIN") return forbiddenResponse()

    const body = await request.json()
    const { id, active, plan, maxBranches, name, email, phone } = body

    if (!id) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 })
    }

    const data: any = {}
    if (active !== undefined) data.active = active
    if (plan !== undefined) {
      const normalizedPlan = String(plan).toLowerCase()
      const planConfig = await prisma.planConfig.findUnique({ where: { name: normalizedPlan } })
      data.plan = normalizedPlan
      if (planConfig) data.maxBranches = planConfig.maxBranches
    }
    if (maxBranches !== undefined) data.maxBranches = maxBranches
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone

    const tenant = await prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id },
        data,
        include: {
          _count: {
            select: {
              branches: true,
              staff: true,
              orders: true,
            },
          },
        },
      })

      if (plan !== undefined) {
        await tx.subscription.create({
          data: {
            tenantId: id,
            plan: String(plan).toLowerCase(),
            status: "ACTIVE",
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          },
        })
      }

      return updatedTenant
    })

    return NextResponse.json(tenant)
  } catch (error) {
    console.error("Tenant update error:", error)
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 })
  }
}

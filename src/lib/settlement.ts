import { prisma } from "./prisma"

export async function calculateCommission(params: {
  tenantId: string
  vendorId: string
  orderTotal: number
  orderType: string
}): Promise<number> {
  // Find applicable commission rules (vendor-specific first, then tenant-wide)
  const rules = await prisma.commissionRule.findMany({
    where: {
      tenantId: params.tenantId,
      active: true,
      OR: [
        { vendorId: params.vendorId },
        { vendorId: null },
      ],
    },
    orderBy: { createdAt: "desc" },
  })

  // Prefer vendor-specific rule, fall back to tenant-wide
  const rule = rules.find((r) => r.vendorId === params.vendorId)
    || rules.find((r) => !r.vendorId && (!r.channel || r.channel === params.orderType))

  if (!rule) {
    // Fall back to vendor's default commission rate
    const vendor = await prisma.vendor.findUnique({ where: { id: params.vendorId } })
    if (vendor?.commissionRate) {
      return params.orderTotal * (vendor.commissionRate / 100)
    }
    return 0
  }

  if (rule.minOrder && params.orderTotal < rule.minOrder) return 0

  switch (rule.type) {
    case "PERCENTAGE":
      return params.orderTotal * (rule.value / 100)
    case "FLAT":
      return rule.value
    case "TIERED":
      // For tiered, value is stored as JSON in description or use percentage as default
      return params.orderTotal * (rule.value / 100)
    default:
      return 0
  }
}

export async function recordSaleSettlement(params: {
  tenantId: string
  vendorId: string
  orderId: string
  orderTotal: number
  orderType: string
}) {
  const commission = await calculateCommission({
    tenantId: params.tenantId,
    vendorId: params.vendorId,
    orderTotal: params.orderTotal,
    orderType: params.orderType,
  })

  const vendorEarning = params.orderTotal - commission

  // Record sale credit to vendor
  await prisma.settlementLedger.create({
    data: {
      tenantId: params.tenantId,
      vendorId: params.vendorId,
      orderId: params.orderId,
      type: "SALE",
      amount: vendorEarning,
      description: `Sale from order`,
    },
  })

  // Record commission debit
  if (commission > 0) {
    await prisma.settlementLedger.create({
      data: {
        tenantId: params.tenantId,
        vendorId: params.vendorId,
        orderId: params.orderId,
        type: "COMMISSION",
        amount: -commission,
        description: `Commission on order`,
      },
    })
  }

  return { vendorEarning, commission }
}

export async function recordRentCharge(params: {
  tenantId: string
  vendorId: string
  period: string
}) {
  const agreement = await prisma.rentAgreement.findFirst({
    where: {
      tenantId: params.tenantId,
      vendorId: params.vendorId,
      active: true,
    },
  })

  if (!agreement) return null

  let rentAmount = 0

  switch (agreement.type) {
    case "FIXED":
      rentAmount = agreement.fixedAmount || 0
      break
    case "REVENUE_SHARE": {
      // Calculate revenue for the period
      const periodStart = new Date(params.period + "-01")
      const periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      const revenue = await prisma.order.aggregate({
        where: {
          vendorId: params.vendorId,
          status: { in: ["COMPLETED", "SERVED"] },
          createdAt: { gte: periodStart, lt: periodEnd },
        },
        _sum: { total: true },
      })
      rentAmount = (revenue._sum.total || 0) * ((agreement.sharePercentage || 0) / 100)
      break
    }
    case "HYBRID":
      rentAmount = agreement.fixedAmount || 0
      // Plus revenue share portion
      const periodStartH = new Date(params.period + "-01")
      const periodEndH = new Date(periodStartH)
      periodEndH.setMonth(periodEndH.getMonth() + 1)

      const revenueH = await prisma.order.aggregate({
        where: {
          vendorId: params.vendorId,
          status: { in: ["COMPLETED", "SERVED"] },
          createdAt: { gte: periodStartH, lt: periodEndH },
        },
        _sum: { total: true },
      })
      rentAmount += (revenueH._sum.total || 0) * ((agreement.sharePercentage || 0) / 100)
      break
  }

  if (rentAmount > 0) {
    await prisma.settlementLedger.create({
      data: {
        tenantId: params.tenantId,
        vendorId: params.vendorId,
        type: "RENT",
        amount: -rentAmount,
        description: `Rent charge for ${params.period} (${agreement.type})`,
      },
    })
  }

  return { rentAmount, type: agreement.type }
}

export async function getVendorBalance(vendorId: string): Promise<number> {
  const result = await prisma.settlementLedger.aggregate({
    where: { vendorId },
    _sum: { amount: true },
  })
  return result._sum.amount || 0
}

export async function createPayout(params: {
  tenantId: string
  vendorId: string
  amount: number
  period: string
}) {
  const payout = await prisma.vendorPayout.create({
    data: {
      tenantId: params.tenantId,
      vendorId: params.vendorId,
      amount: params.amount,
      period: params.period,
      status: "PENDING",
    },
  })

  // Record payout in ledger
  await prisma.settlementLedger.create({
    data: {
      tenantId: params.tenantId,
      vendorId: params.vendorId,
      type: "PAYOUT",
      amount: -params.amount,
      description: `Payout for ${params.period}`,
    },
  })

  return payout
}

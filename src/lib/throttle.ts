import { prisma } from "./prisma"

export interface ThrottleResult {
  allowed: boolean
  reason?: string
  activeOrders?: number
  maxActiveTickets?: number
}

export async function checkVendorCapacity(vendorId: string): Promise<ThrottleResult> {
  const rule = await prisma.vendorCapacityRule.findFirst({
    where: { vendorId, active: true },
  })

  if (!rule) return { allowed: true }

  // Check active tickets (orders in NEW or PREPARING status)
  const activeOrders = await prisma.order.count({
    where: {
      vendorId,
      status: { in: ["NEW", "PREPARING"] },
    },
  })

  if (activeOrders >= rule.maxActiveTickets) {
    await prisma.orderThrottleLog.create({
      data: {
        vendorId,
        action: "THROTTLED",
        reason: `Active tickets (${activeOrders}) >= max (${rule.maxActiveTickets})`,
      },
    })
    return {
      allowed: false,
      reason: `Vendor has too many active orders (${activeOrders}/${rule.maxActiveTickets})`,
      activeOrders,
      maxActiveTickets: rule.maxActiveTickets,
    }
  }

  // Check orders per window
  const windowStart = new Date(Date.now() - rule.windowMinutes * 60000)
  const ordersInWindow = await prisma.order.count({
    where: {
      vendorId,
      createdAt: { gte: windowStart },
    },
  })

  if (ordersInWindow >= rule.maxOrdersPerWindow) {
    await prisma.orderThrottleLog.create({
      data: {
        vendorId,
        action: "THROTTLED",
        reason: `Orders in window (${ordersInWindow}) >= max (${rule.maxOrdersPerWindow})`,
      },
    })
    return {
      allowed: false,
      reason: `Vendor is at capacity (${ordersInWindow} orders in last ${rule.windowMinutes} min)`,
      activeOrders,
      maxActiveTickets: rule.maxActiveTickets,
    }
  }

  return { allowed: true, activeOrders, maxActiveTickets: rule.maxActiveTickets }
}

export async function pauseVendor(vendorId: string, reason: string) {
  await prisma.orderThrottleLog.create({
    data: { vendorId, action: "PAUSED", reason },
  })
}

export async function resumeVendor(vendorId: string) {
  await prisma.orderThrottleLog.create({
    data: { vendorId, action: "RESUMED", reason: "Manual resume" },
  })
}

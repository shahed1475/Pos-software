import { prisma } from "../prisma"

// RFM (Recency, Frequency, Monetary) scoring engine
export interface RFMScore {
  customerId: string
  customerName: string
  recency: number    // days since last order
  frequency: number  // total orders
  monetary: number   // total spent
  rScore: number     // 1-5
  fScore: number     // 1-5
  mScore: number     // 1-5
  segment: string
}

function scoreValue(value: number, thresholds: number[], invert = false): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (invert ? value > thresholds[i] : value <= thresholds[i]) return i + 1
  }
  return 5
}

function getSegment(r: number, f: number, m: number): string {
  const avg = (r + f + m) / 3
  if (r >= 4 && f >= 4 && m >= 4) return "Champions"
  if (r >= 4 && f >= 3) return "Loyal Customers"
  if (r >= 4 && f <= 2) return "New Customers"
  if (r <= 2 && f >= 3) return "At Risk"
  if (r <= 2 && f <= 2) return "Lost"
  if (avg >= 3.5) return "Potential Loyalists"
  if (avg >= 2.5) return "Need Attention"
  return "Hibernating"
}

export async function calculateRFMScores(tenantId: string): Promise<RFMScore[]> {
  // Get customer data from orders
  const customers = await prisma.order.groupBy({
    by: ["customerPhone"],
    where: {
      tenantId,
      customerPhone: { not: null },
      status: { in: ["COMPLETED", "SERVED"] },
    },
    _count: true,
    _sum: { total: true },
    _max: { createdAt: true },
  })

  if (customers.length === 0) return []

  const now = Date.now()
  const rawScores = customers
    .filter((c) => c.customerPhone)
    .map((c) => {
      const lastOrder = c._max.createdAt ? new Date(c._max.createdAt).getTime() : 0
      return {
        customerId: c.customerPhone!,
        customerName: c.customerPhone!,
        recency: Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24)),
        frequency: c._count,
        monetary: c._sum.total || 0,
      }
    })

  // Calculate thresholds (quintiles)
  const recencies = rawScores.map((s) => s.recency).sort((a, b) => a - b)
  const frequencies = rawScores.map((s) => s.frequency).sort((a, b) => a - b)
  const monetaries = rawScores.map((s) => s.monetary).sort((a, b) => a - b)

  function quintiles(arr: number[]) {
    return [0.2, 0.4, 0.6, 0.8].map((p) => arr[Math.floor(arr.length * p)] || 0)
  }

  const rThresholds = quintiles(recencies)
  const fThresholds = quintiles(frequencies)
  const mThresholds = quintiles(monetaries)

  return rawScores.map((s) => {
    const rScore = scoreValue(s.recency, rThresholds, true) // Lower recency = higher score
    const fScore = scoreValue(s.frequency, fThresholds)
    const mScore = scoreValue(s.monetary, mThresholds)

    return {
      ...s,
      rScore,
      fScore,
      mScore,
      segment: getSegment(rScore, fScore, mScore),
    }
  })
}

export async function getChurnRisk(tenantId: string) {
  const scores = await calculateRFMScores(tenantId)
  return scores
    .filter((s) => s.segment === "At Risk" || s.segment === "Lost" || s.segment === "Hibernating")
    .sort((a, b) => a.rScore - b.rScore)
}

export async function getSegmentSummary(tenantId: string) {
  const scores = await calculateRFMScores(tenantId)
  const segments: Record<string, { count: number; avgMonetary: number; avgFrequency: number }> = {}

  for (const score of scores) {
    if (!segments[score.segment]) {
      segments[score.segment] = { count: 0, avgMonetary: 0, avgFrequency: 0 }
    }
    segments[score.segment].count++
    segments[score.segment].avgMonetary += score.monetary
    segments[score.segment].avgFrequency += score.frequency
  }

  return Object.entries(segments).map(([segment, data]) => ({
    segment,
    count: data.count,
    avgMonetary: data.count > 0 ? data.avgMonetary / data.count : 0,
    avgFrequency: data.count > 0 ? data.avgFrequency / data.count : 0,
  }))
}

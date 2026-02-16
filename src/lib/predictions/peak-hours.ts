interface HourlySummary {
  date: string
  hour: number
  totalOrders: number
  totalRevenue: number
}

interface PeakHourResult {
  hour: number
  avgOrders: number
  avgRevenue: number
  stddev: number
  intensity: "peak" | "moderate" | "quiet"
}

interface DayOfWeekPattern {
  day: number // 0=Sunday, 6=Saturday
  dayName: string
  peakHours: number[]
  avgOrders: number
}

export function predictPeakHours(hourlySummaries: HourlySummary[]): {
  hourly: PeakHourResult[]
  dayPatterns: DayOfWeekPattern[]
} {
  // Group by hour across all dates
  const byHour = new Map<number, number[]>()
  for (let h = 0; h < 24; h++) byHour.set(h, [])

  for (const s of hourlySummaries) {
    byHour.get(s.hour)?.push(s.totalOrders)
  }

  const hourlyStats: PeakHourResult[] = []
  for (let h = 0; h < 24; h++) {
    const values = byHour.get(h) || []
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0
    const variance = values.length > 1
      ? values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1)
      : 0
    const stddev = Math.sqrt(variance)

    hourlyStats.push({ hour: h, avgOrders: avg, avgRevenue: 0, stddev, intensity: "quiet" })
  }

  // Calculate avg revenue per hour
  const revByHour = new Map<number, number[]>()
  for (let h = 0; h < 24; h++) revByHour.set(h, [])
  for (const s of hourlySummaries) {
    revByHour.get(s.hour)?.push(s.totalRevenue)
  }
  for (const stat of hourlyStats) {
    const revs = revByHour.get(stat.hour) || []
    stat.avgRevenue = revs.length > 0 ? revs.reduce((s, v) => s + v, 0) / revs.length : 0
  }

  // Classify intensity based on percentiles
  const avgOrders = hourlyStats.map((h) => h.avgOrders).filter((v) => v > 0)
  if (avgOrders.length > 0) {
    const sorted = [...avgOrders].sort((a, b) => a - b)
    const p75 = sorted[Math.floor(sorted.length * 0.75)]
    const p25 = sorted[Math.floor(sorted.length * 0.25)]

    for (const stat of hourlyStats) {
      if (stat.avgOrders >= p75) stat.intensity = "peak"
      else if (stat.avgOrders >= p25) stat.intensity = "moderate"
      else stat.intensity = "quiet"
    }
  }

  // Day-of-week patterns
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const byDayHour = new Map<number, Map<number, number[]>>()
  for (let d = 0; d < 7; d++) byDayHour.set(d, new Map())

  for (const s of hourlySummaries) {
    const dayOfWeek = new Date(s.date).getDay()
    const dayMap = byDayHour.get(dayOfWeek)!
    if (!dayMap.has(s.hour)) dayMap.set(s.hour, [])
    dayMap.get(s.hour)!.push(s.totalOrders)
  }

  const dayPatterns: DayOfWeekPattern[] = []
  for (let d = 0; d < 7; d++) {
    const dayMap = byDayHour.get(d)!
    let totalOrders = 0
    let count = 0
    const hourAvgs: { hour: number; avg: number }[] = []

    for (const [hour, values] of Array.from(dayMap.entries())) {
      const avg = values.reduce((s: number, v: number) => s + v, 0) / values.length
      hourAvgs.push({ hour, avg })
      totalOrders += values.reduce((s: number, v: number) => s + v, 0)
      count += values.length
    }

    hourAvgs.sort((a, b) => b.avg - a.avg)
    const peakHours = hourAvgs.filter((h) => h.avg > 0).slice(0, 3).map((h) => h.hour)

    dayPatterns.push({
      day: d,
      dayName: dayNames[d],
      peakHours,
      avgOrders: count > 0 ? totalOrders / (count / 24) : 0, // avg orders per day
    })
  }

  return {
    hourly: hourlyStats.sort((a, b) => b.avgOrders - a.avgOrders),
    dayPatterns,
  }
}

"use client"

interface HourlyHeatmapProps {
  data: { date: string; hour: number; totalOrders: number }[]
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-muted"
  const ratio = value / max
  if (ratio > 0.75) return "bg-red-500"
  if (ratio > 0.5) return "bg-orange-400"
  if (ratio > 0.25) return "bg-yellow-300"
  return "bg-green-200"
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No hourly data available.
      </div>
    )
  }

  // Build grid: day-of-week x hour
  const grid: Record<number, Record<number, number>> = {}
  for (let d = 0; d < 7; d++) {
    grid[d] = {}
    for (let h = 0; h < 24; h++) grid[d][h] = 0
  }

  for (const item of data) {
    const day = new Date(item.date).getDay()
    grid[day][item.hour] = (grid[day][item.hour] || 0) + item.totalOrders
  }

  // Count weeks per day for averaging
  const weekCount = new Map<number, number>()
  const seenDayDates = new Map<number, Set<string>>()
  for (const item of data) {
    const day = new Date(item.date).getDay()
    if (!seenDayDates.has(day)) seenDayDates.set(day, new Set())
    seenDayDates.get(day)!.add(item.date)
  }
  for (const [day, dates] of Array.from(seenDayDates.entries())) {
    weekCount.set(day, dates.size)
  }

  // Average
  for (let d = 0; d < 7; d++) {
    const wc = weekCount.get(d) || 1
    for (let h = 0; h < 24; h++) {
      grid[d][h] = Math.round((grid[d][h] / wc) * 10) / 10
    }
  }

  const maxVal = Math.max(...Object.values(grid).flatMap((row) => Object.values(row)))
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-0.5 text-xs">
          <div />
          {hours.map((h) => (
            <div key={h} className="text-center text-muted-foreground py-1">
              {h.toString().padStart(2, "0")}
            </div>
          ))}
          {DAYS.map((day, d) => (
            <>
              <div key={`label-${d}`} className="flex items-center font-medium pr-2">
                {day}
              </div>
              {hours.map((h) => (
                <div
                  key={`${d}-${h}`}
                  className={`aspect-square rounded-sm ${getColor(grid[d][h], maxVal)} flex items-center justify-center`}
                  title={`${day} ${h}:00 - Avg: ${grid[d][h]} orders`}
                >
                  <span className="text-[10px] opacity-70">
                    {grid[d][h] > 0 ? grid[d][h] : ""}
                  </span>
                </div>
              ))}
            </>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="w-4 h-4 rounded-sm bg-green-200" />
          <div className="w-4 h-4 rounded-sm bg-yellow-300" />
          <div className="w-4 h-4 rounded-sm bg-orange-400" />
          <div className="w-4 h-4 rounded-sm bg-red-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

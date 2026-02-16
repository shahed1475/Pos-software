"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface PeakHourData {
  hour: number
  avgOrders: number
  avgRevenue: number
  intensity: "peak" | "moderate" | "quiet"
}

interface PeakHoursChartProps {
  data: PeakHourData[]
}

const COLORS = {
  peak: "#ef4444",
  moderate: "#f59e0b",
  quiet: "#22c55e",
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No peak hour data available.
      </div>
    )
  }

  // Sort by hour for display
  const sorted = [...data].sort((a, b) => a.hour - b.hour)

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500" /> Peak</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500" /> Moderate</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500" /> Quiet</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sorted}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="hour"
            fontSize={12}
            tickFormatter={(h) => `${h}:00`}
          />
          <YAxis />
          <Tooltip
            formatter={(value: number) => [value.toFixed(1), "Avg Orders"]}
            labelFormatter={(h) => `${h}:00 - ${(h as number) + 1}:00`}
          />
          <Bar dataKey="avgOrders" name="Avg Orders" radius={[4, 4, 0, 0]}>
            {sorted.map((entry, index) => (
              <Cell key={index} fill={COLORS[entry.intensity]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

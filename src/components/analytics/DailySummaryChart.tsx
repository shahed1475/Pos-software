"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface DailySummaryChartProps {
  data: { date: string; totalRevenue: number; completedOrders: number }[]
}

export function DailySummaryChart({ data }: DailySummaryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No summary data available. Run aggregation first or check the date range.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === "totalRevenue" ? `$${value.toFixed(2)}` : value,
            name === "totalRevenue" ? "Revenue" : "Orders",
          ]}
        />
        <Legend />
        <Area yAxisId="left" type="monotone" dataKey="totalRevenue" stroke="#3b82f6" fill="#3b82f680" name="Revenue" />
        <Area yAxisId="right" type="monotone" dataKey="completedOrders" stroke="#10b981" fill="#10b98180" name="Orders" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

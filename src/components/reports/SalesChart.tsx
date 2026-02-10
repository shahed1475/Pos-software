"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface SalesChartProps {
  data: { date: string; revenue: number; orders: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No sales data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === "revenue" ? `$${value.toFixed(2)}` : value,
            name === "revenue" ? "Revenue" : "Orders",
          ]}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="orders" fill="#10b981" name="Orders" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

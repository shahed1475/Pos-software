"use client"

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

interface ForecastPoint {
  date: string
  revenue: number
  isForecasted: boolean
  confidenceLow?: number
  confidenceHigh?: number
}

interface SalesForecastChartProps {
  historical: ForecastPoint[]
  forecast: ForecastPoint[]
  trend: string
  r2: number
}

export function SalesForecastChart({ historical, forecast, trend, r2 }: SalesForecastChartProps) {
  if (historical.length === 0 && forecast.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Not enough data for forecasting. Need at least 3 days of sales data.
      </div>
    )
  }

  // Combine data — only last 30 days of historical + forecast
  const recentHistorical = historical.slice(-30)
  const combined = [
    ...recentHistorical.map((h) => ({
      date: h.date,
      actual: h.revenue,
      forecast: null as number | null,
      confidenceLow: null as number | null,
      confidenceHigh: null as number | null,
    })),
    // Bridge point: last historical connects to first forecast
    ...forecast.map((f) => ({
      date: f.date,
      actual: null as number | null,
      forecast: f.revenue,
      confidenceLow: f.confidenceLow ?? null,
      confidenceHigh: f.confidenceHigh ?? null,
    })),
  ]

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-muted-foreground">
          Trend: <span className={
            trend === "increasing" ? "text-green-600 font-medium" :
            trend === "decreasing" ? "text-red-600 font-medium" :
            "text-yellow-600 font-medium"
          }>{trend}</span>
        </span>
        <span className="text-muted-foreground">
          Fit (R²): <span className="font-medium">{r2}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={combined}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (value === null || value === undefined) return ["-", name]
              const num = Number(value)
              return [`$${num.toFixed(2)}`, name === "actual" ? "Actual" : name === "forecast" ? "Forecast" : name]
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="confidenceHigh"
            stroke="none"
            fill="#3b82f620"
            name="Confidence Band"
          />
          <Area
            type="monotone"
            dataKey="confidenceLow"
            stroke="none"
            fill="#ffffff"
            name=""
          />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="Actual" />
          <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

import { exponentialMovingAverage } from "./moving-average"
import { linearRegression } from "./linear-regression"

interface DailySummary {
  date: string
  totalRevenue: number
  completedOrders: number
}

interface ForecastPoint {
  date: string
  revenue: number
  orders: number
  isForecasted: boolean
  confidenceLow?: number
  confidenceHigh?: number
}

export function forecastSales(
  dailySummaries: DailySummary[],
  daysAhead: number = 7
): {
  historical: ForecastPoint[]
  forecast: ForecastPoint[]
  trend: "increasing" | "decreasing" | "stable"
  r2: number
} {
  if (dailySummaries.length < 3) {
    return { historical: [], forecast: [], trend: "stable", r2: 0 }
  }

  const sorted = [...dailySummaries].sort((a, b) => a.date.localeCompare(b.date))
  const revenues = sorted.map((s) => s.totalRevenue)
  const orders = sorted.map((s) => s.completedOrders)

  // Historical data
  const historical: ForecastPoint[] = sorted.map((s) => ({
    date: s.date,
    revenue: s.totalRevenue,
    orders: s.completedOrders,
    isForecasted: false,
  }))

  // Exponential smoothing for forecasting
  const smoothedRevenue = exponentialMovingAverage(revenues, 0.3)
  const smoothedOrders = exponentialMovingAverage(orders, 0.3)

  // Linear regression for trend
  const revenuePoints = revenues.map((y, i) => ({ x: i, y }))
  const regression = linearRegression(revenuePoints)

  // Calculate residual standard deviation for confidence intervals
  const residuals = revenues.map((y, i) => y - (regression.slope * i + regression.intercept))
  const residualStdDev = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 2, 1)
  )

  // Generate forecast points
  const lastSmoothedRevenue = smoothedRevenue[smoothedRevenue.length - 1]
  const lastSmoothedOrders = smoothedOrders[smoothedOrders.length - 1]
  const lastDate = new Date(sorted[sorted.length - 1].date)

  const forecast: ForecastPoint[] = []
  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(lastDate)
    forecastDate.setDate(forecastDate.getDate() + i)
    const dateStr = forecastDate.toISOString().split("T")[0]

    // Blend exponential smoothing with linear trend
    const trendValue = regression.predict(revenues.length - 1 + i)
    const blendedRevenue = 0.7 * lastSmoothedRevenue + 0.3 * trendValue
    const forecastedRevenue = Math.max(0, blendedRevenue)

    // Confidence interval widens with distance
    const margin = 1.96 * residualStdDev * Math.sqrt(1 + i / revenues.length)

    forecast.push({
      date: dateStr,
      revenue: Math.round(forecastedRevenue * 100) / 100,
      orders: Math.max(0, Math.round(lastSmoothedOrders)),
      isForecasted: true,
      confidenceLow: Math.max(0, Math.round((forecastedRevenue - margin) * 100) / 100),
      confidenceHigh: Math.round((forecastedRevenue + margin) * 100) / 100,
    })
  }

  return {
    historical,
    forecast,
    trend: regression.trend,
    r2: Math.round(regression.r2 * 1000) / 1000,
  }
}

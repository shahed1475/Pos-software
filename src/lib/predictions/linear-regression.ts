export interface RegressionResult {
  slope: number
  intercept: number
  r2: number
  predict: (x: number) => number
  trend: "increasing" | "decreasing" | "stable"
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length
  if (n < 2) {
    return { slope: 0, intercept: points[0]?.y || 0, r2: 0, predict: () => points[0]?.y || 0, trend: "stable" }
  }

  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)

  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) {
    const avg = sumY / n
    return { slope: 0, intercept: avg, r2: 0, predict: () => avg, trend: "stable" }
  }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n

  // R-squared
  const meanY = sumY / n
  const ssTotal = points.reduce((s, p) => s + (p.y - meanY) ** 2, 0)
  const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0

  const trend: "increasing" | "decreasing" | "stable" =
    r2 > 0.3 && slope > 0 ? "increasing" :
    r2 > 0.3 && slope < 0 ? "decreasing" : "stable"

  return {
    slope,
    intercept,
    r2,
    predict: (x: number) => slope * x + intercept,
    trend,
  }
}

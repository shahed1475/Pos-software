export function simpleMovingAverage(data: number[], windowSize: number): number[] {
  if (data.length < windowSize) return [...data]
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(data[i])
    } else {
      const window = data.slice(i - windowSize + 1, i + 1)
      result.push(window.reduce((s, v) => s + v, 0) / windowSize)
    }
  }
  return result
}

export function exponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return []
  const result: number[] = [data[0]]
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

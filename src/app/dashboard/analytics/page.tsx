"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DailySummaryChart } from "@/components/analytics/DailySummaryChart"
import { HourlyHeatmap } from "@/components/analytics/HourlyHeatmap"
import { SalesForecastChart } from "@/components/analytics/SalesForecastChart"
import { PeakHoursChart } from "@/components/analytics/PeakHoursChart"
import { ReorderTable } from "@/components/analytics/ReorderTable"
import { AggregationPanel } from "@/components/analytics/AggregationPanel"
import { formatCurrency } from "@/lib/utils"
import { DollarSign, ShoppingCart, TrendingUp, BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role || ""
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0])

  // Summary data
  const [dailyData, setDailyData] = useState<any>(null)
  const [hourlyData, setHourlyData] = useState<any>(null)
  const [source, setSource] = useState<string>("")

  // Predictions
  const [peakHours, setPeakHours] = useState<any>(null)
  const [forecast, setForecast] = useState<any>(null)
  const [forecastDays, setForecastDays] = useState(7)
  const [reorder, setReorder] = useState<any>(null)

  // Aggregation jobs
  const [jobs, setJobs] = useState<any[]>([])

  const fetchSummary = useCallback(async () => {
    try {
      const [dailyRes, hourlyRes] = await Promise.all([
        fetch(`/api/reports/summary?type=daily&from=${fromDate}&to=${toDate}`),
        fetch(`/api/reports/summary?type=hourly&from=${fromDate}&to=${toDate}`),
      ])
      if (dailyRes.ok) {
        const data = await dailyRes.json()
        setDailyData(data)
        setSource(data.source)
      }
      if (hourlyRes.ok) setHourlyData(await hourlyRes.json())
    } catch (error) {
      console.error("Failed to fetch summary:", error)
    }
  }, [fromDate, toDate])

  const fetchPredictions = useCallback(async () => {
    try {
      const [peakRes, forecastRes, reorderRes] = await Promise.all([
        fetch("/api/predictions?type=peak-hours"),
        fetch(`/api/predictions?type=sales-forecast&days=${forecastDays}`),
        fetch("/api/predictions?type=reorder"),
      ])
      if (peakRes.ok) setPeakHours(await peakRes.json())
      if (forecastRes.ok) setForecast(await forecastRes.json())
      if (reorderRes.ok) setReorder(await reorderRes.json())
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
    }
  }, [forecastDays])

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/aggregation")
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    fetchPredictions()
  }, [fetchPredictions])

  useEffect(() => {
    if (isAdmin) fetchJobs()
  }, [isAdmin, fetchJobs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Sales insights, predictions, and data aggregation
          {source && <span className="ml-2 text-xs">(Source: {source})</span>}
        </p>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          {isAdmin && <TabsTrigger value="aggregation">Aggregation</TabsTrigger>}
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="flex items-center gap-4">
            <div>
              <Label>From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-6">
              {[
                { label: "7 Days", days: 7 },
                { label: "30 Days", days: 30 },
                { label: "90 Days", days: 90 },
              ].map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() - preset.days)
                    setFromDate(d.toISOString().split("T")[0])
                    setToDate(new Date().toISOString().split("T")[0])
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {dailyData?.totals && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(dailyData.totals.totalRevenue)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                    <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Orders</p>
                    <p className="text-2xl font-bold">{dailyData.totals.completedOrders}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(dailyData.totals.avgOrderValue)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
                    <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold">{formatCurrency(dailyData.totals.netProfit || 0)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue & Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <DailySummaryChart data={dailyData?.summaries || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders by Hour & Day of Week</CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyHeatmap data={hourlyData?.summaries || []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <PeakHoursChart data={peakHours?.hourly || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sales Forecast</CardTitle>
                <div className="flex gap-2">
                  {[7, 30].map((d) => (
                    <Button
                      key={d}
                      variant={forecastDays === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForecastDays(d)}
                    >
                      {d} Days
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SalesForecastChart
                historical={forecast?.historical || []}
                forecast={forecast?.forecast || []}
                trend={forecast?.trend || "stable"}
                r2={forecast?.r2 || 0}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reorder Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <ReorderTable data={reorder?.suggestions || []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aggregation Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="aggregation">
            <AggregationPanel jobs={jobs} onRefresh={fetchJobs} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

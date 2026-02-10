"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SalesChart } from "@/components/reports/SalesChart"
import { ReportTable } from "@/components/reports/ReportTable"
import { formatCurrency } from "@/lib/utils"
import { Download, DollarSign, ShoppingCart, TrendingUp, Percent } from "lucide-react"

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0])

  useEffect(() => {
    fetchReport()
  }, [fromDate, toDate])

  async function fetchReport() {
    try {
      const res = await fetch(`/api/reports?type=sales&from=${fromDate}&to=${toDate}`)
      if (res.ok) setReport(await res.json())
    } catch (error) {
      console.error("Failed to fetch report:", error)
    }
  }

  async function exportCSV() {
    if (!report) return
    try {
      const { unparse } = await import("papaparse")
      const csvData = report.dailyData.map((d: any) => ({
        Date: d.date,
        Revenue: d.revenue.toFixed(2),
        Orders: d.orders,
      }))
      const csv = unparse(csvData)
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales-report-${fromDate}-to-${toDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("CSV export failed:", error)
    }
  }

  async function exportPDF() {
    if (!report) return
    try {
      const { default: jsPDF } = await import("jspdf")
      const { default: autoTable } = await import("jspdf-autotable")

      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text("Sales Report", 14, 22)
      doc.setFontSize(10)
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, 30)
      doc.text(`Total Revenue: ${formatCurrency(report.totalRevenue)}`, 14, 36)
      doc.text(`Total Orders: ${report.totalOrders}`, 14, 42)
      doc.text(`Average Order: ${formatCurrency(report.avgOrderValue)}`, 14, 48)

      autoTable(doc, {
        startY: 55,
        head: [["Date", "Revenue", "Orders"]],
        body: report.dailyData.map((d: any) => [
          d.date,
          `$${d.revenue.toFixed(2)}`,
          d.orders.toString(),
        ]),
      })

      doc.save(`sales-report-${fromDate}-to-${toDate}.pdf`)
    } catch (error) {
      console.error("PDF export failed:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Sales data and business insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

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
            { label: "Today", days: 0 },
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

      {report && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(report.totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                  <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{report.totalOrders}</p>
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
                  <p className="text-2xl font-bold">{formatCurrency(report.avgOrderValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
                  <Percent className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tax</p>
                  <p className="text-2xl font-bold">{formatCurrency(report.totalTax)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue & Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesChart data={report.dailyData || []} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportTable
                  title="Top Items"
                  data={report.topItems || []}
                  columns={["Item", "Qty Sold", "Revenue"]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportTable
                  title="Categories"
                  data={(report.categoryBreakdown || []).map((c: any) => ({
                    name: c.name,
                    quantity: c.orders,
                    revenue: c.revenue,
                  }))}
                  columns={["Category", "Items Sold", "Revenue"]}
                />
              </CardContent>
            </Card>
          </div>

          {report.paymentBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  {Object.entries(report.paymentBreakdown).map(([method, amount]) => (
                    <div key={method} className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground">{method}</p>
                      <p className="text-xl font-bold">{formatCurrency(amount as number)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

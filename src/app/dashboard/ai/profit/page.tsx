"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, TrendingUp, AlertTriangle, HelpCircle } from "lucide-react"

const CLASS_COLORS: Record<string, string> = {
  STAR: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PUZZLE: "bg-purple-100 text-purple-800 border-purple-300",
  PLOWHORSE: "bg-blue-100 text-blue-800 border-blue-300",
  DOG: "bg-red-100 text-red-800 border-red-300",
}

const CLASS_ICONS: Record<string, any> = {
  STAR: Star,
  PUZZLE: HelpCircle,
  PLOWHORSE: TrendingUp,
  DOG: AlertTriangle,
}

export default function ProfitPage() {
  const [matrix, setMatrix] = useState<any[]>([])
  const [discounts, setDiscounts] = useState<any>(null)

  useEffect(() => {
    fetchMatrix()
    fetchDiscounts()
  }, [])

  async function fetchMatrix() {
    const res = await fetch("/api/ai/profit?type=matrix")
    if (res.ok) setMatrix(await res.json())
  }

  async function fetchDiscounts() {
    const res = await fetch("/api/ai/profit?type=discounts")
    if (res.ok) setDiscounts(await res.json())
  }

  const classCounts = matrix.reduce((acc: Record<string, number>, item) => {
    acc[item.classification] = (acc[item.classification] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profit Optimization</h1>
        <p className="text-muted-foreground">Menu engineering matrix and discount analysis</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {["STAR", "PUZZLE", "PLOWHORSE", "DOG"].map((cls) => {
          const Icon = CLASS_ICONS[cls]
          return (
            <Card key={cls}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-full p-3 ${CLASS_COLORS[cls]}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{cls}s</p>
                  <p className="text-2xl font-bold">{classCounts[cls] || 0}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix">Menu Engineering Matrix</TabsTrigger>
          <TabsTrigger value="discounts">Discount Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell>${item.price.toFixed(2)}</TableCell>
                    <TableCell>${item.costPrice.toFixed(2)}</TableCell>
                    <TableCell>{item.marginPercent.toFixed(0)}%</TableCell>
                    <TableCell>{item.totalSold}</TableCell>
                    <TableCell>${item.totalRevenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={CLASS_COLORS[item.classification]}>{item.classification}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs">{item.recommendation}</TableCell>
                  </TableRow>
                ))}
                {matrix.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No data available. Complete some orders with menu items that have cost prices set.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          {discounts && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Discounted Orders</p>
                    <p className="text-2xl font-bold">{discounts.totalDiscounted}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Total Discounts</p>
                    <p className="text-2xl font-bold">${discounts.totalDiscountAmount.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Avg Discount %</p>
                    <p className="text-2xl font-bold">{discounts.avgDiscountPercent.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              {discounts.alerts?.length > 0 && (
                <Card className="border-orange-300">
                  <CardHeader>
                    <CardTitle className="text-orange-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Discount Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {discounts.alerts.map((alert: string, idx: number) => (
                      <p key={idx} className="text-sm py-1">{alert}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Discounts by Staff</CardTitle></CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Discounts Given</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.staffDiscounts?.map((s: any) => (
                      <TableRow key={s.staffId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.count}</TableCell>
                        <TableCell>${s.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

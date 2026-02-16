"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, AlertTriangle, TrendingDown, Heart } from "lucide-react"

const SEGMENT_COLORS: Record<string, string> = {
  Champions: "bg-green-100 text-green-800",
  "Loyal Customers": "bg-blue-100 text-blue-800",
  "Potential Loyalists": "bg-cyan-100 text-cyan-800",
  "New Customers": "bg-purple-100 text-purple-800",
  "Need Attention": "bg-yellow-100 text-yellow-800",
  "At Risk": "bg-orange-100 text-orange-800",
  Hibernating: "bg-gray-100 text-gray-800",
  Lost: "bg-red-100 text-red-800",
}

export default function MarketingPage() {
  const [segments, setSegments] = useState<any[]>([])
  const [churnRisk, setChurnRisk] = useState<any[]>([])
  const [rfmScores, setRfmScores] = useState<any[]>([])

  useEffect(() => {
    fetchSegments()
    fetchChurn()
    fetchRFM()
  }, [])

  async function fetchSegments() {
    const res = await fetch("/api/ai/marketing?type=segments")
    if (res.ok) setSegments(await res.json())
  }

  async function fetchChurn() {
    const res = await fetch("/api/ai/marketing?type=churn")
    if (res.ok) setChurnRisk(await res.json())
  }

  async function fetchRFM() {
    const res = await fetch("/api/ai/marketing?type=rfm")
    if (res.ok) setRfmScores(await res.json())
  }

  const totalCustomers = segments.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Smart Marketing</h1>
        <p className="text-muted-foreground">Customer segmentation, churn detection, and campaign insights</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Champions</p>
              <p className="text-2xl font-bold">{segments.find((s) => s.segment === "Champions")?.count || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">At Risk</p>
              <p className="text-2xl font-bold">{segments.find((s) => s.segment === "At Risk")?.count || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lost</p>
              <p className="text-2xl font-bold">{segments.find((s) => s.segment === "Lost")?.count || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="segments">
        <TabsList>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="churn">Churn Risk</TabsTrigger>
          <TabsTrigger value="rfm">RFM Scores</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {segments.map((seg) => (
              <Card key={seg.segment}>
                <CardContent className="p-4">
                  <Badge className={SEGMENT_COLORS[seg.segment] || "bg-gray-100"}>{seg.segment}</Badge>
                  <p className="text-2xl font-bold mt-2">{seg.count}</p>
                  <p className="text-sm text-muted-foreground">Avg spend: ${seg.avgMonetary.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Avg orders: {seg.avgFrequency.toFixed(1)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="churn" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Customers at Risk of Churning</CardTitle></CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Segment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churnRisk.slice(0, 20).map((c, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{c.customerName}</TableCell>
                    <TableCell>{c.recency} days ago</TableCell>
                    <TableCell>{c.frequency}</TableCell>
                    <TableCell>${c.monetary.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={SEGMENT_COLORS[c.segment] || "bg-gray-100"}>{c.segment}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {churnRisk.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No churn risk data. Customers are identified from order phone numbers.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rfm" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>R</TableHead>
                  <TableHead>F</TableHead>
                  <TableHead>M</TableHead>
                  <TableHead>Recency (days)</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Segment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfmScores.slice(0, 50).map((s, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{s.customerName}</TableCell>
                    <TableCell>{s.rScore}</TableCell>
                    <TableCell>{s.fScore}</TableCell>
                    <TableCell>{s.mScore}</TableCell>
                    <TableCell>{s.recency}</TableCell>
                    <TableCell>{s.frequency}</TableCell>
                    <TableCell>${s.monetary.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={SEGMENT_COLORS[s.segment] || "bg-gray-100"}>{s.segment}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])

  useEffect(() => {
    fetchPurchases()
  }, [])

  async function fetchPurchases() {
    try {
      const res = await fetch("/api/inventory?purchases=true")
      if (res.ok) {
        const data = await res.json()
        // Fetch purchases from a separate endpoint or aggregate
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Purchase History</h1>
        <p className="text-muted-foreground">Track ingredient purchases and restocking</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No purchases recorded yet. Record purchases from the Inventory page.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase: any) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDateTime(purchase.createdAt)}</TableCell>
                    <TableCell className="font-medium">{purchase.ingredient?.name}</TableCell>
                    <TableCell className="text-right">{purchase.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(purchase.totalCost)}</TableCell>
                    <TableCell>{purchase.supplier || "-"}</TableCell>
                    <TableCell>{purchase.note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

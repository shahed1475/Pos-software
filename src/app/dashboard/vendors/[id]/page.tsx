"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Store, DollarSign, ShoppingBag, Users, ArrowLeft, Package } from "lucide-react"
import Link from "next/link"

export default function VendorDetailPage() {
  const params = useParams()
  const vendorId = params.id as string
  const [vendor, setVendor] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [reports, setReports] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchVendor()
    fetchMenu()
    fetchReports()
  }, [vendorId])

  async function fetchVendor() {
    const res = await fetch(`/api/vendors/${vendorId}`)
    if (res.ok) setVendor(await res.json())
  }

  async function fetchMenu() {
    const res = await fetch(`/api/vendors/${vendorId}/menu`)
    if (res.ok) setMenuItems(await res.json())
  }

  async function fetchReports() {
    const res = await fetch(`/api/vendors/${vendorId}/reports`)
    if (res.ok) setReports(await res.json())
  }

  if (!vendor) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/vendors">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{vendor.name}</h1>
            <Badge variant={vendor.active ? "default" : "destructive"}>
              {vendor.active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="secondary">{vendor.kycStatus}</Badge>
          </div>
          <p className="text-muted-foreground">{vendor.description || vendor.slug}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">${(reports?.revenue || 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{reports?.totalOrders || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Menu Items</p>
              <p className="text-2xl font-bold">{vendor._count?.menuItems || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Staff</p>
              <p className="text-2xl font-bold">{vendor._count?.vendorStaff || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="menu">
        <TabsList>
          <TabsTrigger value="menu">Menu Items</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="top-items">Top Items</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category?.name || "—"}</TableCell>
                    <TableCell>${item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.available ? "default" : "secondary"}>
                        {item.available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {menuItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No menu items</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendor.vendorStaff?.map((vs: any) => (
                  <TableRow key={vs.id}>
                    <TableCell className="font-medium">{vs.staff.name}</TableCell>
                    <TableCell><Badge variant="outline">{vs.role}</Badge></TableCell>
                    <TableCell>{vs.staff.email || "—"}</TableCell>
                    <TableCell>{vs.staff.phone || "—"}</TableCell>
                  </TableRow>
                ))}
                {(!vendor.vendorStaff || vendor.vendorStaff.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No staff assigned</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="top-items" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Quantity Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.topItems?.map((ti: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{ti.menuItem?.name || "Unknown"}</TableCell>
                    <TableCell>${(ti.menuItem?.price || 0).toFixed(2)}</TableCell>
                    <TableCell>{ti.totalQuantity || 0}</TableCell>
                  </TableRow>
                ))}
                {(!reports?.topItems || reports.topItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No sales data yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Name</p>
                  <p className="font-medium">{vendor.contactName || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Email</p>
                  <p className="font-medium">{vendor.contactEmail || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Phone</p>
                  <p className="font-medium">{vendor.contactPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Commission Rate</p>
                  <p className="font-medium">{vendor.commissionRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-medium">{vendor.branch?.name || "All Branches"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Settlement Balance</p>
                  <p className="text-2xl font-bold text-green-600">${(reports?.settlementBalance || 0).toFixed(2)}</p>
                </div>
              </div>
              {vendor.commissionRules?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Active Commission Rules</p>
                  {vendor.commissionRules.map((rule: any) => (
                    <Badge key={rule.id} variant="outline" className="mr-2">
                      {rule.type}: {rule.value}{rule.type === "PERCENTAGE" ? "%" : ""} {rule.channel ? `(${rule.channel})` : ""}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

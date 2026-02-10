"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TableGrid } from "@/components/tables/TableGrid"
import { Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function TablesPage() {
  const [tables, setTables] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialog, setDetailDialog] = useState<any>(null)
  const [form, setForm] = useState({ number: "", capacity: "4" })
  const { toast } = useToast()

  useEffect(() => { fetchTables() }, [])

  async function fetchTables() {
    const res = await fetch("/api/tables")
    if (res.ok) setTables(await res.json())
  }

  async function handleCreate() {
    if (!form.number) {
      toast({ title: "Table number required", variant: "destructive" })
      return
    }
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: "Table created" })
        setDialogOpen(false)
        fetchTables()
      } else {
        toast({ title: "Failed to create table", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error creating table", variant: "destructive" })
    }
  }

  async function updateTableStatus(tableId: string, status: string) {
    try {
      await fetch(`/api/tables/${tableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      toast({ title: `Table status updated to ${status}` })
      fetchTables()
      setDetailDialog(null)
    } catch {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const statusCounts = {
    AVAILABLE: tables.filter((t) => t.status === "AVAILABLE").length,
    OCCUPIED: tables.filter((t) => t.status === "OCCUPIED").length,
    RESERVED: tables.filter((t) => t.status === "RESERVED").length,
    MAINTENANCE: tables.filter((t) => t.status === "MAINTENANCE").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-muted-foreground">Manage your restaurant floor plan</p>
        </div>
        <Button onClick={() => { setForm({ number: "", capacity: "4" }); setDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Add Table
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.AVAILABLE}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{statusCounts.OCCUPIED}</p>
            <p className="text-sm text-muted-foreground">Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{statusCounts.RESERVED}</p>
            <p className="text-sm text-muted-foreground">Reserved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{statusCounts.MAINTENANCE}</p>
            <p className="text-sm text-muted-foreground">Maintenance</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Floor Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <TableGrid
            tables={tables}
            onTableClick={setDetailDialog}
          />
        </CardContent>
      </Card>

      {/* Add Table Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Number *</Label>
              <Input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Table {detailDialog?.number}</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge>{detailDialog.status}</Badge>
                <span className="text-sm text-muted-foreground">Capacity: {detailDialog.capacity}</span>
              </div>
              {detailDialog.orders?.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Active Orders:</p>
                  {detailDialog.orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between rounded border p-2 mb-1">
                      <span>Order #{order.orderNumber}</span>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>Change Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"].map((status) => (
                    <Button
                      key={status}
                      variant={detailDialog.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTableStatus(detailDialog.id, status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

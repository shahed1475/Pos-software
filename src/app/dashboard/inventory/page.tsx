"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { StockTable } from "@/components/inventory/StockTable"
import { useToast } from "@/components/ui/use-toast"
import { Plus, AlertTriangle, Package, Search } from "lucide-react"

export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [purchaseDialog, setPurchaseDialog] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState({
    name: "",
    unit: "",
    stock: "0",
    minStock: "0",
    costPerUnit: "0",
  })
  const [purchaseForm, setPurchaseForm] = useState({
    quantity: "",
    totalCost: "",
    supplier: "",
    note: "",
  })
  const { toast } = useToast()

  useEffect(() => { fetchIngredients() }, [])

  async function fetchIngredients() {
    const res = await fetch("/api/inventory")
    if (res.ok) setIngredients(await res.json())
  }

  const filteredIngredients = ingredients.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStockCount = ingredients.filter((i) => i.stock <= i.minStock).length
  const totalValue = ingredients.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0)

  function openCreate() {
    setEditingItem(null)
    setForm({ name: "", unit: "", stock: "0", minStock: "0", costPerUnit: "0" })
    setDialogOpen(true)
  }

  function openEdit(item: any) {
    setEditingItem(item)
    setForm({
      name: item.name,
      unit: item.unit,
      stock: item.stock.toString(),
      minStock: item.minStock.toString(),
      costPerUnit: item.costPerUnit.toString(),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.unit) {
      toast({ title: "Name and unit required", variant: "destructive" })
      return
    }
    try {
      if (editingItem) {
        await fetch("/api/inventory", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...form }),
        })
        toast({ title: "Ingredient updated" })
      } else {
        await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        toast({ title: "Ingredient added" })
      }
      setDialogOpen(false)
      fetchIngredients()
    } catch {
      toast({ title: "Failed to save", variant: "destructive" })
    }
  }

  async function handlePurchase() {
    if (!purchaseForm.quantity || !purchaseForm.totalCost) {
      toast({ title: "Quantity and cost required", variant: "destructive" })
      return
    }
    try {
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "purchase",
          ingredientId: purchaseDialog.id,
          ...purchaseForm,
        }),
      })
      toast({ title: "Purchase recorded & stock updated" })
      setPurchaseDialog(null)
      setPurchaseForm({ quantity: "", totalCost: "", supplier: "", note: "" })
      fetchIngredients()
    } catch {
      toast({ title: "Failed to record purchase", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Track stock levels and purchases</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Ingredient
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{ingredients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <StockTable
            ingredients={filteredIngredients}
            onEdit={openEdit}
            onPurchase={(item) => {
              setPurchaseDialog(item)
              setPurchaseForm({ quantity: "", totalCost: "", supplier: "", note: "" })
            }}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Unit * (kg, liters, pieces, etc.)</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Current Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div>
                <Label>Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
              </div>
              <div>
                <Label>Cost/Unit</Label>
                <Input type="number" step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog */}
      <Dialog open={!!purchaseDialog} onOpenChange={() => setPurchaseDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Purchase - {purchaseDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current stock: {purchaseDialog?.stock} {purchaseDialog?.unit}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input type="number" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Total Cost *</Label>
                <Input type="number" step="0.01" value={purchaseForm.totalCost} onChange={(e) => setPurchaseForm({ ...purchaseForm, totalCost: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Supplier</Label>
              <Input value={purchaseForm.supplier} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} />
            </div>
            <div>
              <Label>Note</Label>
              <Input value={purchaseForm.note} onChange={(e) => setPurchaseForm({ ...purchaseForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseDialog(null)}>Cancel</Button>
            <Button onClick={handlePurchase}>Record Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

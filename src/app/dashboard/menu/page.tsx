"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { CategoryTabs } from "@/components/menu/CategoryTabs"
import { MenuGrid } from "@/components/menu/MenuGrid"
import { Plus, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function MenuPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<any>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    available: true,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCategories()
    fetchItems()
  }, [])

  async function fetchCategories() {
    const res = await fetch("/api/categories")
    if (res.ok) setCategories(await res.json())
  }

  async function fetchItems() {
    const res = await fetch("/api/menu")
    if (res.ok) setItems(await res.json())
  }

  const filteredItems = items.filter((item) => {
    const matchesCategory = !activeCategory || item.categoryId === activeCategory
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function openCreateDialog() {
    setEditingItem(null)
    setForm({ name: "", description: "", price: "", categoryId: categories[0]?.id || "", available: true })
    setDialogOpen(true)
  }

  function openEditDialog(item: any) {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      categoryId: item.categoryId,
      available: item.available,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.categoryId) {
      toast({ title: "Please fill all required fields", variant: "destructive" })
      return
    }

    try {
      if (editingItem) {
        const res = await fetch(`/api/menu/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          toast({ title: "Menu item updated" })
        }
      } else {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          toast({ title: "Menu item created" })
        }
      }
      setDialogOpen(false)
      fetchItems()
    } catch {
      toast({ title: "Failed to save item", variant: "destructive" })
    }
  }

  async function handleDelete() {
    if (!deleteDialog) return
    try {
      await fetch(`/api/menu/${deleteDialog.id}`, { method: "DELETE" })
      toast({ title: "Menu item deleted" })
      setDeleteDialog(null)
      fetchItems()
    } catch {
      toast({ title: "Failed to delete item", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu</h1>
          <p className="text-muted-foreground">Manage your menu items</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <MenuGrid
        items={filteredItems}
        onEdit={openEditDialog}
        onDelete={setDeleteDialog}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price *</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
              <Label>Available</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

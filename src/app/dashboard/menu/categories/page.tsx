"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<any>(null)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [form, setForm] = useState({ name: "", sortOrder: "0", active: true })
  const { toast } = useToast()

  useEffect(() => { fetchCategories() }, [])

  async function fetchCategories() {
    const res = await fetch("/api/categories")
    if (res.ok) setCategories(await res.json())
  }

  function openCreate() {
    setEditingCategory(null)
    setForm({ name: "", sortOrder: "0", active: true })
    setDialogOpen(true)
  }

  function openEdit(cat: any) {
    setEditingCategory(cat)
    setForm({ name: cat.name, sortOrder: cat.sortOrder.toString(), active: cat.active })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name) {
      toast({ title: "Name is required", variant: "destructive" })
      return
    }
    try {
      if (editingCategory) {
        await fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCategory.id, name: form.name, sortOrder: parseInt(form.sortOrder), active: form.active }),
        })
        toast({ title: "Category updated" })
      } else {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name, sortOrder: parseInt(form.sortOrder), active: form.active }),
        })
        toast({ title: "Category created" })
      }
      setDialogOpen(false)
      fetchCategories()
    } catch {
      toast({ title: "Failed to save", variant: "destructive" })
    }
  }

  async function handleDelete() {
    if (!deleteDialog) return
    try {
      await fetch(`/api/categories?id=${deleteDialog.id}`, { method: "DELETE" })
      toast({ title: "Category deleted" })
      setDeleteDialog(null)
      fetchCategories()
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage menu categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.sortOrder}</TableCell>
                  <TableCell>{cat._count?.items || 0}</TableCell>
                  <TableCell>
                    <Badge variant={cat.active ? "success" : "secondary"}>
                      {cat.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDialog(cat)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog?.name}?</AlertDialogTitle>
            <AlertDialogDescription>All items in this category will also be affected.</AlertDialogDescription>
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

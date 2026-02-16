"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, Edit, Store, Users, ShoppingBag, Trash2 } from "lucide-react"
import Link from "next/link"

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<any>(null)
  const [deleteDialog, setDeleteDialog] = useState<any>(null)
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    commissionRate: "0",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchVendors()
  }, [])

  async function fetchVendors() {
    const res = await fetch("/api/vendors")
    if (res.ok) setVendors(await res.json())
  }

  function openCreate() {
    setEditingVendor(null)
    setForm({ name: "", slug: "", description: "", contactName: "", contactPhone: "", contactEmail: "", commissionRate: "0" })
    setDialogOpen(true)
  }

  function openEdit(vendor: any) {
    setEditingVendor(vendor)
    setForm({
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description || "",
      contactName: vendor.contactName || "",
      contactPhone: vendor.contactPhone || "",
      contactEmail: vendor.contactEmail || "",
      commissionRate: String(vendor.commissionRate || 0),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    try {
      const url = editingVendor ? `/api/vendors/${editingVendor.id}` : "/api/vendors"
      const method = editingVendor ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast({ title: editingVendor ? "Vendor updated" : "Vendor created" })
        setDialogOpen(false)
        fetchVendors()
      } else {
        const err = await res.json()
        toast({ title: err.error || "Failed to save", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error saving vendor", variant: "destructive" })
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Vendor deactivated" })
        fetchVendors()
      }
    } catch {
      toast({ title: "Error deleting vendor", variant: "destructive" })
    }
    setDeleteDialog(null)
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }

  const filtered = vendors.filter((v) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = vendors.filter((v) => v.active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Manage marketplace vendors and their operations</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Vendor</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{vendors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Vendors</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Menu Items</p>
              <p className="text-2xl font-bold">{vendors.reduce((sum, v) => sum + (v._count?.menuItems || 0), 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Menu Items</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/vendors/${vendor.id}`} className="hover:underline">
                    {vendor.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{vendor.slug}</TableCell>
                <TableCell>{vendor.contactName || "—"}</TableCell>
                <TableCell>{vendor.commissionRate}%</TableCell>
                <TableCell>
                  <Badge variant={vendor.kycStatus === "APPROVED" ? "default" : "secondary"}>
                    {vendor.kycStatus}
                  </Badge>
                </TableCell>
                <TableCell>{vendor._count?.menuItems || 0}</TableCell>
                <TableCell>{vendor._count?.orders || 0}</TableCell>
                <TableCell>
                  <Badge variant={vendor.active ? "default" : "destructive"}>
                    {vendor.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(vendor)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(vendor)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No vendors found. Click &quot;Add Vendor&quot; to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => {
                  const name = e.target.value
                  setForm({ ...form, name, ...(!editingVendor && { slug: autoSlug(name) }) })
                }} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div>
                <Label>Commission Rate (%)</Label>
                <Input type="number" step="0.1" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Phone</Label>
                <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingVendor ? "Update Vendor" : "Create Vendor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate {deleteDialog?.name}. Their menu items and orders will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteDialog?.id)}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, UserX, Shield } from "lucide-react"

const roles = ["ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"]

const roleBadgeColors: Record<string, any> = {
  ADMIN: "destructive",
  MANAGER: "default",
  CASHIER: "secondary",
  WAITER: "outline",
  KITCHEN: "warning",
}

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [form, setForm] = useState({
    name: "",
    pin: "",
    role: "CASHIER",
    phone: "",
    email: "",
    active: true,
  })
  const { toast } = useToast()

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    const res = await fetch("/api/staff")
    if (res.ok) setStaff(await res.json())
  }

  function openCreate() {
    setEditingStaff(null)
    setForm({ name: "", pin: "", role: "CASHIER", phone: "", email: "", active: true })
    setDialogOpen(true)
  }

  function openEdit(member: any) {
    setEditingStaff(member)
    setForm({
      name: member.name,
      pin: "",
      role: member.role,
      phone: member.phone || "",
      email: member.email || "",
      active: member.active,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    if (!editingStaff && !form.pin) {
      toast({ title: "PIN required for new staff", variant: "destructive" })
      return
    }

    try {
      const payload: any = { ...form }
      if (!payload.pin) delete payload.pin

      if (editingStaff) {
        payload.id = editingStaff.id
        await fetch("/api/staff", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Staff member updated" })
      } else {
        await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Staff member added" })
      }
      setDialogOpen(false)
      fetchStaff()
    } catch {
      toast({ title: "Failed to save", variant: "destructive" })
    }
  }

  async function toggleActive(member: any) {
    try {
      await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, active: !member.active }),
      })
      toast({ title: member.active ? "Staff deactivated" : "Staff activated" })
      fetchStaff()
    } catch {
      toast({ title: "Failed to update", variant: "destructive" })
    }
  }

  const activeCount = staff.filter((s) => s.active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground">
            {activeCount} active staff members
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id} className={!member.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      {member.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeColors[member.role] || "secondary"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.phone || "-"}</TableCell>
                  <TableCell>{member.email || "-"}</TableCell>
                  <TableCell>{member._count?.orders || 0}</TableCell>
                  <TableCell>
                    <Badge variant={member.active ? "success" : "secondary"}>
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(member)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={member.active ? "text-destructive" : "text-green-600"}
                      onClick={() => toggleActive(member)}
                    >
                      <UserX className="h-4 w-4" />
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
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{editingStaff ? "New PIN (leave empty to keep current)" : "PIN * (4-6 digits)"}</Label>
              <Input
                type="password"
                maxLength={6}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                placeholder={editingStaff ? "Leave empty to keep current" : "Enter PIN"}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
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
    </div>
  )
}

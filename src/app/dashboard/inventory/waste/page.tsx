"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/lib/utils"
import { Trash2, Plus, AlertTriangle, ClipboardList } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
  stock: number
}

interface WasteRecord {
  id: string
  createdAt: string
  ingredient: {
    id: string
    name: string
    unit: string
  }
  quantity: number
  reason: string | null
  recordedBy: {
    id: string
    name: string
  } | null
}

interface WasteStats {
  totalRecords: number
  totalQuantity: number
}

export default function WasteTrackingPage() {
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [stats, setStats] = useState<WasteStats>({ totalRecords: 0, totalQuantity: 0 })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    ingredientId: "",
    quantity: "",
    reason: "",
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchIngredients()
    fetchWasteRecords()
  }, [])

  async function fetchIngredients() {
    try {
      const res = await fetch("/api/inventory")
      if (res.ok) {
        const data = await res.json()
        setIngredients(data)
      }
    } catch (error) {
      console.error("Failed to fetch ingredients:", error)
    }
  }

  async function fetchWasteRecords() {
    setLoading(true)
    try {
      const res = await fetch("/api/inventory/waste")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setWasteRecords(data)
          setStats({
            totalRecords: data.length,
            totalQuantity: data.reduce(
              (sum: number, record: WasteRecord) => sum + record.quantity,
              0
            ),
          })
        } else if (data.records && data.stats) {
          setWasteRecords(data.records)
          setStats(data.stats)
        }
      }
    } catch (error) {
      console.error("Failed to fetch waste records:", error)
    } finally {
      setLoading(false)
    }
  }

  function openDialog() {
    setForm({ ingredientId: "", quantity: "", reason: "" })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.ingredientId) {
      toast({ title: "Please select an ingredient", variant: "destructive" })
      return
    }
    if (!form.quantity || parseFloat(form.quantity) <= 0) {
      toast({ title: "Please enter a valid quantity", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/inventory/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: form.ingredientId,
          quantity: parseFloat(form.quantity),
          reason: form.reason || undefined,
        }),
      })

      if (res.ok) {
        toast({ title: "Waste record created successfully" })
        setDialogOpen(false)
        fetchWasteRecords()
        fetchIngredients()
      } else {
        const error = await res.json().catch(() => null)
        toast({
          title: error?.message || "Failed to record waste",
          variant: "destructive",
        })
      }
    } catch {
      toast({ title: "Failed to record waste", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedIngredient = ingredients.find((i) => i.id === form.ingredientId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waste Tracking</h1>
          <p className="text-muted-foreground">
            Record and monitor ingredient waste
          </p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Record Waste
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <ClipboardList className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Waste Records</p>
              <p className="text-2xl font-bold">{stats.totalRecords}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Quantity Wasted (this period)
              </p>
              <p className="text-2xl font-bold text-red-600">{stats.totalQuantity}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waste Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Waste Records
            <Badge variant="secondary" className="ml-2">
              {wasteRecords.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading waste records...
            </p>
          ) : wasteRecords.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No waste records found. Click &quot;Record Waste&quot; to add one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wasteRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.ingredient?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                      {record.quantity}
                    </TableCell>
                    <TableCell>{record.ingredient?.unit ?? "-"}</TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {record.reason || "-"}
                    </TableCell>
                    <TableCell>{record.recordedBy?.name ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Waste Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Waste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ingredient *</Label>
              <Select
                value={form.ingredientId}
                onValueChange={(value) =>
                  setForm({ ...form, ingredientId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.stock} {ingredient.unit}{" "}
                      available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedIngredient && (
                <p className="text-sm text-muted-foreground">
                  Current stock: {selectedIngredient.stock}{" "}
                  {selectedIngredient.unit}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter quantity wasted"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Describe the reason for waste (e.g., expired, spoiled, damaged)"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Recording..." : "Record Waste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

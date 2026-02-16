"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
import { formatDate } from "@/lib/utils"
import { ClipboardList, Filter, RotateCcw } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
}

interface InventoryLog {
  id: string
  createdAt: string
  ingredient: {
    id: string
    name: string
    unit: string
  }
  type: string
  quantity: number
  previousStock: number
  newStock: number
  reason: string | null
  staff: {
    id: string
    name: string
  } | null
}

const LOG_TYPES = [
  { value: "PURCHASE", label: "Purchase" },
  { value: "ORDER_DEDUCTION", label: "Order Deduction" },
  { value: "ORDER_CANCELLATION_ROLLBACK", label: "Cancellation Rollback" },
  { value: "MANUAL_ADJUSTMENT", label: "Manual Adjustment" },
  { value: "WASTE", label: "Waste" },
] as const

type LogType = (typeof LOG_TYPES)[number]["value"]

function getLogTypeBadgeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "PURCHASE":
      return "default"
    case "ORDER_DEDUCTION":
      return "secondary"
    case "ORDER_CANCELLATION_ROLLBACK":
      return "outline"
    case "MANUAL_ADJUSTMENT":
      return "default"
    case "WASTE":
      return "destructive"
    default:
      return "secondary"
  }
}

function getLogTypeLabel(type: string): string {
  const found = LOG_TYPES.find((t) => t.value === type)
  return found ? found.label : type
}

export default function InventoryLogsPage() {
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [selectedIngredient, setSelectedIngredient] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  useEffect(() => {
    fetchIngredients()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [selectedIngredient, selectedType, dateFrom, dateTo])

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

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedIngredient && selectedIngredient !== "all") {
        params.set("ingredientId", selectedIngredient)
      }
      if (selectedType && selectedType !== "all") {
        params.set("type", selectedType)
      }
      if (dateFrom) {
        params.set("from", dateFrom)
      }
      if (dateTo) {
        params.set("to", dateTo)
      }

      const url = `/api/inventory/logs${params.toString() ? `?${params.toString()}` : ""}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Failed to fetch inventory logs:", error)
    } finally {
      setLoading(false)
    }
  }

  function resetFilters() {
    setSelectedIngredient("all")
    setSelectedType("all")
    setDateFrom("")
    setDateTo("")
  }

  const hasActiveFilters =
    selectedIngredient !== "all" ||
    selectedType !== "all" ||
    dateFrom !== "" ||
    dateTo !== ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Logs</h1>
        <p className="text-muted-foreground">Track all stock changes</p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Ingredient</Label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="All Ingredients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ingredients</SelectItem>
                  {ingredients.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Log Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {LOG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Log Entries
            <Badge variant="secondary" className="ml-2">
              {logs.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No inventory logs found. Adjust your filters or check back later.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Previous Stock</TableHead>
                  <TableHead className="text-right">New Stock</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Staff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.ingredient?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLogTypeBadgeVariant(log.type)}>
                        {getLogTypeLabel(log.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          log.quantity > 0
                            ? "font-medium text-green-600 dark:text-green-400"
                            : log.quantity < 0
                            ? "font-medium text-red-600 dark:text-red-400"
                            : ""
                        }
                      >
                        {log.quantity > 0 ? "+" : ""}
                        {log.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{log.previousStock}</TableCell>
                    <TableCell className="text-right">{log.newStock}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.reason || "-"}
                    </TableCell>
                    <TableCell>{log.staff?.name ?? "-"}</TableCell>
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

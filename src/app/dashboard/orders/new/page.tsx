"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CategoryTabs } from "@/components/menu/CategoryTabs"
import { OrderForm } from "@/components/orders/OrderForm"
import { formatCurrency } from "@/lib/utils"
import { Search, User, Phone, MapPin } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { CartItem } from "@/types"

export default function NewOrderPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [menuItems, setMenuItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<string>("DINE_IN")
  const [selectedTable, setSelectedTable] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddr, setCustomerAddr] = useState("")
  const [notes, setNotes] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [cashReceived, setCashReceived] = useState("")
  const [taxRate, setTaxRate] = useState(10)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchMenuItems()
    fetchCategories()
    fetchTables()
    fetchSettings()
  }, [])

  async function fetchMenuItems() {
    const res = await fetch("/api/menu?available=true")
    if (res.ok) setMenuItems(await res.json())
  }

  async function fetchCategories() {
    const res = await fetch("/api/categories")
    if (res.ok) setCategories(await res.json())
  }

  async function fetchTables() {
    const res = await fetch("/api/tables")
    if (res.ok) setTables(await res.json())
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.taxRate !== undefined) setTaxRate(data.taxRate)
      }
    } catch {}
  }

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = !activeCategory || item.categoryId === activeCategory
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  function addToCart(menuItem: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItem.id)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItem.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
        },
      ]
    })
  }

  function incrementItem(menuItemId: string) {
    setCart((prev) =>
      prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
      )
    )
  }

  function decrementItem(menuItemId: string) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  function removeItem(menuItemId: string) {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  async function handleSubmitOrder() {
    if (cart.length === 0) {
      toast({ title: "Add items to the order", variant: "destructive" })
      return
    }
    if (orderType === "DINE_IN" && !selectedTable) {
      toast({ title: "Select a table for dine-in orders", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: orderType,
          tableId: orderType === "DINE_IN" ? selectedTable : null,
          staffId: (session?.user as any)?.id,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerAddr: orderType === "DELIVERY" ? customerAddr : null,
          notes: notes || null,
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.price,
            variant: item.variant,
            notes: item.notes,
          })),
        }),
      })

      if (!orderRes.ok) throw new Error("Failed to create order")
      const order = await orderRes.json()

      // Process payment
      await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          method: paymentMethod,
          amount: total,
        }),
      })

      toast({ title: `Order #${order.orderNumber} created successfully!` })
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
      setCustomerAddr("")
      setNotes("")
      setPaymentOpen(false)
      setCashReceived("")
      router.push("/dashboard/orders")
    } catch (error) {
      toast({ title: "Failed to create order", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const change = cashReceived ? parseFloat(cashReceived) - total : 0

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left side - Menu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Order Type & Table */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {[
              { value: "DINE_IN", label: "Dine In" },
              { value: "TAKEAWAY", label: "Takeaway" },
              { value: "DELIVERY", label: "Delivery" },
            ].map((type) => (
              <Button
                key={type.value}
                variant={orderType === type.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setOrderType(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>

          {orderType === "DINE_IN" && (
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Table" />
              </SelectTrigger>
              <SelectContent>
                {tables
                  .filter((t) => t.status === "AVAILABLE" || t.status === "OCCUPIED")
                  .map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      Table {table.number} ({table.capacity} seats)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {(orderType === "TAKEAWAY" || orderType === "DELIVERY") && (
            <>
              <Input
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-40"
              />
              <Input
                placeholder="Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-36"
              />
            </>
          )}
          {orderType === "DELIVERY" && (
            <Input
              placeholder="Delivery address"
              value={customerAddr}
              onChange={(e) => setCustomerAddr(e.target.value)}
              className="w-48"
            />
          )}
        </div>

        {/* Search & Category Tabs */}
        <div className="mb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="flex flex-col items-center rounded-lg border bg-card p-3 text-center hover:shadow-md hover:border-primary transition-all"
              >
                <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center mb-2">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-md" />
                  ) : (
                    <span className="text-3xl">🍽️</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate w-full">{item.name}</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(item.price)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="w-80 lg:w-96 flex-shrink-0">
        <OrderForm
          items={cart}
          subtotal={subtotal}
          taxAmount={taxAmount}
          discount={0}
          total={total}
          onIncrement={incrementItem}
          onDecrement={decrementItem}
          onRemove={removeItem}
          onClear={() => setCart([])}
          onPay={() => setPaymentOpen(true)}
        />
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-4xl font-bold">{formatCurrency(total)}</p>
            </div>

            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["CASH", "CARD", "MOBILE", "OTHER"].map((method) => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? "default" : "outline"}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "CASH" && (
              <div>
                <Label>Cash Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="text-lg"
                />
                {parseFloat(cashReceived) >= total && (
                  <div className="mt-2 rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                    <p className="text-sm text-green-600 dark:text-green-400">Change</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(change)}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Order Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitOrder}
              disabled={submitting || (paymentMethod === "CASH" && parseFloat(cashReceived) < total)}
            >
              {submitting ? "Processing..." : `Complete Order`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

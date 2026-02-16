"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function GuestCartPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenantSlug as string

  const [cart, setCart] = useState<any>(null)
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem(`guest_token_${tenantSlug}`)
    if (token) {
      setGuestToken(token)
      fetchCart(token)
    }
  }, [tenantSlug])

  async function fetchCart(token: string) {
    const res = await fetch(`/api/guest/cart?token=${token}`)
    if (res.ok) setCart(await res.json())
  }

  async function updateQuantity(cartItemId: string, quantity: number) {
    const res = await fetch("/api/guest/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug,
        guestToken,
        action: quantity === 0 ? "remove" : "update",
        cartItemId,
        quantity,
      }),
    })
    if (res.ok) setCart(await res.json())
  }

  async function placeOrder() {
    setSubmitting(true)
    setError("")

    const res = await fetch("/api/guest/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestToken, customerName, customerPhone }),
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.removeItem(`guest_token_${tenantSlug}`)
      // Navigate to order tracking for first order
      if (data.orders?.[0]?.id) {
        router.push(`/order/${tenantSlug}/status/${data.orders[0].id}`)
      }
    } else {
      const err = await res.json()
      setError(err.error || "Failed to place order")
    }
    setSubmitting(false)
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">Your cart is empty</p>
        <button onClick={() => router.push(`/order/${tenantSlug}`)} className="bg-black text-white px-6 py-2 rounded-full">
          Browse Menu
        </button>
      </div>
    )
  }

  // Group items by vendor
  const vendorGroups = cart.items.reduce((acc: any, item: any) => {
    const vendorName = item.vendor?.name || "General"
    if (!acc[vendorName]) acc[vendorName] = []
    acc[vendorName].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500">&#8592;</button>
          <h1 className="text-xl font-bold">Your Cart</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {Object.entries(vendorGroups).map(([vendor, items]: [string, any]) => (
          <div key={vendor} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <p className="font-medium text-sm text-gray-600">{vendor}</p>
            </div>
            {items.map((item: any) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between border-b last:border-0">
                <div className="flex-1">
                  <p className="font-medium">{item.menuItem?.name}</p>
                  <p className="text-sm text-gray-500">${item.unitPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">
                    -
                  </button>
                  <span className="w-6 text-center font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-full border flex items-center justify-center text-sm">
                    +
                  </button>
                  <span className="font-bold ml-2 w-16 text-right">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          <h2 className="font-medium">Your Details (optional)</h2>
          <input
            type="text"
            placeholder="Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold">Total</span>
            <span className="text-lg font-bold">${cart.total.toFixed(2)}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={submitting}
            className="w-full bg-black text-white py-3 rounded-full font-medium disabled:opacity-50"
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  )
}

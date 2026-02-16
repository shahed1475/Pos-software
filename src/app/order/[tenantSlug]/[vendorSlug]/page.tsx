"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function VendorMenuPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSlug = params.tenantSlug as string
  const vendorSlug = params.vendorSlug as string
  const table = searchParams.get("table")

  const [data, setData] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<any>(null)
  const [guestToken, setGuestToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(`guest_token_${tenantSlug}`)
    if (token) {
      setGuestToken(token)
      fetchCart(token)
    }
    fetchMenu()
  }, [tenantSlug, vendorSlug])

  async function fetchMenu() {
    const res = await fetch(`/api/guest/menu?tenant=${tenantSlug}&vendor=${vendorSlug}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  async function fetchCart(token: string) {
    const res = await fetch(`/api/guest/cart?token=${token}`)
    if (res.ok) setCart(await res.json())
  }

  async function addToCart(menuItemId: string) {
    const res = await fetch("/api/guest/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug,
        tableNumber: table,
        guestToken,
        action: "add",
        menuItemId,
        quantity: 1,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCart(updated)
      if (updated.guestToken && !guestToken) {
        setGuestToken(updated.guestToken)
        localStorage.setItem(`guest_token_${tenantSlug}`, updated.guestToken)
      }
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading menu...</p></div>
  if (!data) return <div className="flex items-center justify-center min-h-screen"><p>Vendor not found</p></div>

  const filteredItems = activeCategory
    ? data.items.filter((i: any) => i.categoryId === activeCategory)
    : data.items

  const cartItemCount = cart?.items?.length || 0
  const cartTotal = cart?.total || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/order/${tenantSlug}${table ? `?table=${table}` : ""}`} className="text-gray-500">
              &#8592;
            </Link>
            <div>
              <h1 className="text-xl font-bold">{data.vendors?.[0]?.name || vendorSlug}</h1>
              <p className="text-sm text-gray-500">{data.tenant.name}{table ? ` - Table ${table}` : ""}</p>
            </div>
          </div>
          {cartItemCount > 0 && (
            <Link href={`/order/${tenantSlug}/cart`} className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium">
              Cart ({cartItemCount}) - ${cartTotal.toFixed(2)}
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${!activeCategory ? "bg-black text-white" : "bg-white border"}`}
          >
            All
          </button>
          {data.categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${activeCategory === cat.id ? "bg-black text-white" : "bg-white border"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-24">
        <div className="space-y-3">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                {item.description && <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>}
                <p className="font-bold mt-1">${item.price.toFixed(2)}</p>
              </div>
              <button
                onClick={() => addToCart(item.id)}
                className="ml-4 bg-black text-white w-8 h-8 rounded-full flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-center text-gray-500 py-8">No items in this category</p>
          )}
        </div>
      </div>
    </div>
  )
}

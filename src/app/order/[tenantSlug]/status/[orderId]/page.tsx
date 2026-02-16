"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

const STATUS_STEPS = ["NEW", "PREPARING", "READY", "SERVED", "COMPLETED"]
const STATUS_LABELS: Record<string, string> = {
  NEW: "Order Received",
  PREPARING: "Being Prepared",
  READY: "Ready for Pickup",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export default function OrderStatusPage() {
  const params = useParams()
  const tenantSlug = params.tenantSlug as string
  const orderId = params.orderId as string
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchOrder()
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrder, 10000)
    return () => clearInterval(interval)
  }, [orderId])

  async function fetchOrder() {
    const res = await fetch(`/api/guest/order?orderId=${orderId}`)
    if (res.ok) {
      setOrder(await res.json())
    } else {
      setError("Order not found")
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href={`/order/${tenantSlug}`} className="bg-black text-white px-6 py-2 rounded-full">
          Back to Menu
        </Link>
      </div>
    )
  }

  if (!order) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>

  const currentStep = STATUS_STEPS.indexOf(order.status)
  const isCancelled = order.status === "CANCELLED"

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 text-center">
          <h1 className="text-xl font-bold">Order Status</h1>
          {order.vendorName && <p className="text-sm text-gray-500">{order.vendorName}</p>}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status indicator */}
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isCancelled ? "bg-red-100" :
            order.status === "READY" ? "bg-green-100" :
            order.status === "COMPLETED" ? "bg-blue-100" :
            "bg-yellow-100"
          }`}>
            <span className="text-3xl">
              {isCancelled ? "✕" :
               order.status === "READY" ? "✓" :
               order.status === "COMPLETED" ? "✓" :
               order.status === "PREPARING" ? "🍳" : "📋"}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{STATUS_LABELS[order.status] || order.status}</h2>
          {order.pickupCode && order.status === "READY" && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">Pickup Code</p>
              <p className="text-4xl font-mono font-bold text-green-700">{order.pickupCode}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isCancelled && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.slice(0, 4).map((step, idx) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    idx <= currentStep ? "bg-black text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                    {idx + 1}
                  </div>
                  {idx < 3 && (
                    <div className={`w-12 h-0.5 mx-1 ${idx < currentStep ? "bg-black" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {STATUS_STEPS.slice(0, 4).map((step) => (
                <p key={step} className="text-[10px] text-gray-500 text-center w-14">{STATUS_LABELS[step]}</p>
              ))}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="font-medium text-sm">Order Items</p>
          </div>
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="px-4 py-3 flex items-center justify-between border-b last:border-0">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">x{item.quantity}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                item.status === "READY" ? "bg-green-100 text-green-700" :
                item.status === "PREPARING" ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between">
            <span className="font-bold">Total</span>
            <span className="font-bold">${order.total?.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center">
          <Link href={`/order/${tenantSlug}`} className="text-sm text-gray-500 underline">
            Order more
          </Link>
        </div>
      </div>
    </div>
  )
}

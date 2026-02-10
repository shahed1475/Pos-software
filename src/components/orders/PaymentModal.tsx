"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { CreditCard, Banknote, Smartphone, CircleDollarSign } from "lucide-react"

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  order: any
  onSuccess: () => void
}

const methodIcons = {
  CASH: Banknote,
  CARD: CreditCard,
  MOBILE: Smartphone,
  OTHER: CircleDollarSign,
}

export function PaymentModal({ open, onClose, order, onSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState("CASH")
  const [cashReceived, setCashReceived] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  if (!order) return null

  const totalPaid = order.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0
  const remaining = order.total - totalPaid
  const change = method === "CASH" && cashReceived ? parseFloat(cashReceived) - remaining : 0

  async function handlePayment() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          method,
          amount: remaining,
        }),
      })

      if (res.ok) {
        toast({ title: "Payment processed successfully!" })
        onSuccess()
        onClose()
      } else {
        toast({ title: "Payment failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Payment error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment - Order #{order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            {totalPaid > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Paid</span>
                  <span>{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Remaining</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              </>
            )}
          </div>

          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["CASH", "CARD", "MOBILE", "OTHER"] as const).map((m) => {
                const Icon = methodIcons[m]
                return (
                  <Button
                    key={m}
                    variant={method === m ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => setMethod(m)}
                  >
                    <Icon className="h-4 w-4" />
                    {m}
                  </Button>
                )
              })}
            </div>
          </div>

          {method === "CASH" && (
            <div>
              <Label>Cash Received</Label>
              <Input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder={remaining.toFixed(2)}
                className="text-lg mt-1"
              />
              {parseFloat(cashReceived) >= remaining && (
                <div className="mt-2 rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                  <p className="text-sm text-green-600 dark:text-green-400">Change Due</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(change)}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handlePayment}
            disabled={loading || (method === "CASH" && parseFloat(cashReceived || "0") < remaining)}
          >
            {loading ? "Processing..." : `Pay ${formatCurrency(remaining)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

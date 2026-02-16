"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"

interface PlanConfig {
  id: string
  name: string
  maxBranches: number
  maxVendors: number
  aiEnabled: boolean
  price: number
  active: boolean
}

interface TenantSubscription {
  id: string
  tenantId: string
  plan: string
  status: string
  tenant?: { name: string; slug: string }
}

interface Invoice {
  id: string
  tenantId: string
  amount: number
  status: string
  dueDate: string
  tenant?: { name: string; slug: string }
}

export default function AdminBillingPage() {
  const { data: session } = useSession()
  const [plans, setPlans] = useState<PlanConfig[]>([])
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  const [planName, setPlanName] = useState("")
  const [planPrice, setPlanPrice] = useState("0")

  useEffect(() => {
    if (session?.user?.role !== "SUPER_ADMIN") return
    refresh()
  }, [session?.user?.role])

  async function refresh() {
    const [p, s, i] = await Promise.all([
      fetch("/api/admin/plans"),
      fetch("/api/admin/subscriptions"),
      fetch("/api/admin/invoices"),
    ])
    if (p.ok) setPlans(await p.json())
    if (s.ok) setSubscriptions(await s.json())
    if (i.ok) setInvoices(await i.json())
  }

  if (session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-bold">Admin Billing</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only super admins can access this page.</p>
      </div>
    )
  }

  async function createPlan() {
    if (!planName.trim()) return
    setLoading(true)
    await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: planName,
        price: Number(planPrice),
        maxBranches: 3,
        maxVendors: 10,
        aiEnabled: true,
        active: true,
      }),
    })
    setPlanName("")
    setPlanPrice("0")
    await refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Billing</h1>
        <p className="text-muted-foreground">SaaS plans, subscriptions, and invoice management</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create/Update Plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="plan name (e.g. pro)"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
          />
          <Input
            placeholder="price"
            type="number"
            value={planPrice}
            onChange={(e) => setPlanPrice(e.target.value)}
          />
          <Button disabled={loading} onClick={createPlan}>
            Save Plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans ({plans.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-md border p-3">
              <p className="font-semibold">{plan.name}</p>
              <p className="text-muted-foreground">
                ${plan.price.toFixed(2)} | branches: {plan.maxBranches} | vendors: {plan.maxVendors} | AI:{" "}
                {plan.aiEnabled ? "enabled" : "disabled"} | {plan.active ? "active" : "inactive"}
              </p>
            </div>
          ))}
          {plans.length === 0 && <p className="text-muted-foreground">No plans configured yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions ({subscriptions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="rounded-md border p-3">
              <p className="font-semibold">{sub.tenant?.name || sub.tenantId}</p>
              <p className="text-muted-foreground">
                plan: {sub.plan} | status: {sub.status}
              </p>
            </div>
          ))}
          {subscriptions.length === 0 && <p className="text-muted-foreground">No subscriptions yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {invoices.slice(0, 20).map((invoice) => (
            <div key={invoice.id} className="rounded-md border p-3">
              <p className="font-semibold">{invoice.tenant?.name || invoice.tenantId}</p>
              <p className="text-muted-foreground">
                ${invoice.amount.toFixed(2)} | {invoice.status} | due {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
          ))}
          {invoices.length === 0 && <p className="text-muted-foreground">No invoices available.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

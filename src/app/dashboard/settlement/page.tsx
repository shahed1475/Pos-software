"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from "lucide-react"

export default function SettlementPage() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [payoutDialog, setPayoutDialog] = useState(false)
  const [payoutForm, setPayoutForm] = useState({ vendorId: "", amount: "", period: "" })
  const [ledgerDialog, setLedgerDialog] = useState<string | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchSummaries()
    fetchPayouts()
  }, [])

  async function fetchSummaries() {
    const res = await fetch("/api/settlement")
    if (res.ok) setSummaries(await res.json())
  }

  async function fetchPayouts() {
    const res = await fetch("/api/settlement/payouts")
    if (res.ok) setPayouts(await res.json())
  }

  async function fetchLedger(vendorId: string) {
    setLedgerDialog(vendorId)
    const res = await fetch(`/api/settlement/vendors/${vendorId}?limit=100`)
    if (res.ok) {
      const data = await res.json()
      setLedgerEntries(data.entries || [])
    }
  }

  async function handleCreatePayout() {
    try {
      const res = await fetch("/api/settlement/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payoutForm),
      })
      if (res.ok) {
        toast({ title: "Payout created" })
        setPayoutDialog(false)
        fetchSummaries()
        fetchPayouts()
      } else {
        const err = await res.json()
        toast({ title: err.error || "Failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", variant: "destructive" })
    }
  }

  async function markPayoutPaid(payoutId: string) {
    const res = await fetch("/api/settlement/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId, status: "PAID" }),
    })
    if (res.ok) {
      toast({ title: "Payout marked as paid" })
      fetchPayouts()
      fetchSummaries()
    }
  }

  const totalBalance = summaries.reduce((sum, s) => sum + s.balance, 0)
  const totalSales = summaries.reduce((sum, s) => sum + s.totalSales, 0)
  const totalCommissions = summaries.reduce((sum, s) => sum + s.totalCommissions, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlement</h1>
          <p className="text-muted-foreground">Vendor payouts, commissions, and reconciliation</p>
        </div>
        <Button onClick={() => setPayoutDialog(true)}>
          <CreditCard className="mr-2 h-4 w-4" /> Create Payout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendor Sales</p>
              <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <ArrowUpRight className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Commissions</p>
              <p className="text-2xl font-bold">${totalCommissions.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold">${totalBalance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
              <ArrowDownRight className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold">{payouts.filter((p) => p.status === "PENDING").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Vendor Balances</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Commissions</TableHead>
              <TableHead>Paid Out</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => (
              <TableRow key={s.vendor.id}>
                <TableCell className="font-medium">{s.vendor.name}</TableCell>
                <TableCell>${s.totalSales.toFixed(2)}</TableCell>
                <TableCell className="text-orange-600">${s.totalCommissions.toFixed(2)}</TableCell>
                <TableCell>${s.totalPaidOut.toFixed(2)}</TableCell>
                <TableCell className="font-bold">${s.balance.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => fetchLedger(s.vendor.id)}>
                    View Ledger
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {payouts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Payouts</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.vendor?.name}</TableCell>
                  <TableCell>${p.amount.toFixed(2)}</TableCell>
                  <TableCell>{p.period}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "PAID" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "PENDING" && (
                      <Button variant="outline" size="sm" onClick={() => markPayoutPaid(p.id)}>Mark Paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={payoutDialog} onOpenChange={setPayoutDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Payout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor</Label>
              <Select value={payoutForm.vendorId} onValueChange={(v) => setPayoutForm({ ...payoutForm, vendorId: v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {summaries.map((s) => (
                    <SelectItem key={s.vendor.id} value={s.vendor.id}>{s.vendor.name} (${s.balance.toFixed(2)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>Period (e.g., 2026-02)</Label>
              <Input value={payoutForm.period} onChange={(e) => setPayoutForm({ ...payoutForm, period: e.target.value })} />
            </div>
            <Button onClick={handleCreatePayout} className="w-full">Create Payout</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ledgerDialog} onOpenChange={() => setLedgerDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Settlement Ledger</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">{e.type}</Badge></TableCell>
                    <TableCell className={e.amount >= 0 ? "text-green-600" : "text-red-600"}>
                      {e.amount >= 0 ? "+" : ""}${e.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{e.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

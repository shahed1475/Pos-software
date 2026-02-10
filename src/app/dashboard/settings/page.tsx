"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Save, Store } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    taxRate: "10",
    currency: "USD",
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings({
          name: data.name || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          taxRate: (data.taxRate || 10).toString(),
          currency: data.currency || "USD",
        })
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast({ title: "Settings saved successfully!" })
      } else {
        toast({ title: "Failed to save settings", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error saving settings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your restaurant</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Restaurant Information
          </CardTitle>
          <CardDescription>Basic details about your restaurant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Restaurant Name</Label>
            <Input
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing Settings</CardTitle>
          <CardDescription>Tax rate and currency configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings({ ...settings, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (E)</SelectItem>
                  <SelectItem value="GBP">GBP (P)</SelectItem>
                  <SelectItem value="PKR">PKR (Rs)</SelectItem>
                  <SelectItem value="INR">INR (R)</SelectItem>
                  <SelectItem value="AED">AED (AED)</SelectItem>
                  <SelectItem value="SAR">SAR (SAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default PINs</CardTitle>
          <CardDescription>Default staff login PINs (change these in Staff Management)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded border p-3">
              <p className="font-medium">Admin</p>
              <p className="text-muted-foreground font-mono">1234</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">Manager</p>
              <p className="text-muted-foreground font-mono">5678</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">Cashier</p>
              <p className="text-muted-foreground font-mono">1111</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">Waiter</p>
              <p className="text-muted-foreground font-mono">2222</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-medium">Kitchen</p>
              <p className="text-muted-foreground font-mono">3333</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}

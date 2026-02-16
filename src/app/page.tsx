"use client"

import { useEffect, useMemo, useState } from "react"
import { signIn } from "next-auth/react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { Building2, Lock, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const [tenantSlug, setTenantSlug] = useState("")
  const [pin, setPin] = useState("")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace("/dashboard")
    }
  }, [status, session, router])

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (pin.length < 4 || pin.length > 6) return false
    if (!isSuperAdmin && !tenantSlug.trim()) return false
    return true
  }, [loading, pin, isSuperAdmin, tenantSlug])

  const validate = () => {
    const normalizedPin = pin.trim()
    if (!/^\d{4,6}$/.test(normalizedPin)) {
      setError("PIN must be 4 to 6 digits.")
      return false
    }
    if (!isSuperAdmin && !tenantSlug.trim()) {
      setError("Tenant slug is required for staff login.")
      return false
    }
    return true
  }

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    setError("")
    if (!validate()) return

    setLoading(true)

    const result = await signIn("credentials", {
      pin: pin.trim(),
      tenantSlug: isSuperAdmin ? undefined : tenantSlug.trim().toLowerCase(),
      redirect: false,
    })

    if (result?.error) {
      setError("Sign in failed. Check tenant slug and PIN.")
      setPin("")
    } else {
      router.replace("/dashboard")
    }
    setLoading(false)
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="pointer-events-none absolute -left-16 top-[-120px] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-[-120px] h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-slate-300/60 bg-white/90 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto">
            <Image
              src="/images/logo.jpg"
              alt="FluxPOS Logo"
              width={88}
              height={88}
              className="rounded-xl border"
              priority
            />
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight">FluxPOS</CardTitle>
            <CardDescription>Secure staff access to your POS workspace</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
              <Button
                type="button"
                variant={isSuperAdmin ? "ghost" : "default"}
                className="h-9 flex-1"
                onClick={() => {
                  setIsSuperAdmin(false)
                  setError("")
                }}
              >
                Staff Login
              </Button>
              <Button
                type="button"
                variant={isSuperAdmin ? "default" : "ghost"}
                className="h-9 flex-1"
                onClick={() => {
                  setIsSuperAdmin(true)
                  setError("")
                }}
              >
                Super Admin
              </Button>
            </div>

            {!isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Tenant Slug</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="tenantSlug"
                    value={tenantSlug}
                    onChange={(e) => {
                      setTenantSlug(e.target.value)
                      setError("")
                    }}
                    placeholder="e.g. fluxpos"
                    className="pl-9"
                    autoComplete="organization"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pin">PIN (4 to 6 digits)</Label>
              <div className="relative">
                {isSuperAdmin ? (
                  <ShieldCheck className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  id="pin"
                  value={pin}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setPin(onlyDigits)
                    setError("")
                  }}
                  placeholder={isSuperAdmin ? "Enter super admin PIN" : "Enter staff PIN"}
                  className="pl-9 tracking-[0.25em]"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  type="password"
                />
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={!canSubmit}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>Staff login needs tenant slug + PIN.</p>
              <p>Super admin login needs PIN only.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

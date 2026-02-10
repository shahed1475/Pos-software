"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Delete } from "lucide-react"

export default function LoginPage() {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit)
      setError("")
    }
  }

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setPin("")
    setError("")
  }

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits")
      return
    }
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      pin,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid PIN. Please try again.")
      setPin("")
    } else {
      router.push("/dashboard")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 relative">
      {/* Theme toggle in top-right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 dark:border dark:border-border">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2">
            <Image
              src="/images/logo.jpg"
              alt="FluxPOS Logo"
              width={100}
              height={100}
              className="rounded-2xl"
              priority
            />
          </div>
          <CardTitle className="text-2xl">FluxPOS</CardTitle>
          <CardDescription>Enter your PIN to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* PIN Display */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 w-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    i < pin.length
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-muted"
                  }`}
                >
                  {i < pin.length ? "\u2022" : ""}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  size="lg"
                  className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handlePinInput(digit)}
                >
                  {digit}
                </Button>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-sm"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handlePinInput("0")}
              >
                0
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={handleDelete}
              >
                <Delete className="h-5 w-5" />
              </Button>
            </div>

            <Button
              className="w-full h-12 text-lg"
              onClick={handleSubmit}
              disabled={pin.length < 4 || loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Default admin PIN: 1234
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

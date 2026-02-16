"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "@/components/theme-provider"
import { ReactNode } from "react"
import { PWARegister } from "@/components/pwa/PWARegister"
import { OfflineBanner } from "@/components/pwa/OfflineBanner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
      <PWARegister />
      <OfflineBanner />
    </SessionProvider>
  )
}

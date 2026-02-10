"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) setTheme(stored)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    function applyTheme() {
      let resolved: "light" | "dark"
      if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      } else {
        resolved = theme
      }
      setResolvedTheme(resolved)
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
    }

    applyTheme()
    localStorage.setItem("theme", theme)

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => { if (theme === "system") applyTheme() }
    media.addEventListener("change", handler)
    return () => media.removeEventListener("change", handler)
  }, [theme, mounted])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

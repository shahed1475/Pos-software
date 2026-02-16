"use client"

import { useEffect } from "react"
import { replayOfflineQueue } from "@/lib/offline-queue"

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Fail silently to avoid blocking app usage if SW registration fails.
    })

    const handleOnline = () => {
      replayOfflineQueue().catch(() => {
        // ignore queue replay failures; next online event will retry
      })
    }

    window.addEventListener("online", handleOnline)
    if (navigator.onLine) {
      handleOnline()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
    }
  }, [])

  return null
}

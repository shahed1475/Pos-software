"use client"

import { useEffect, useState } from "react"

export function OfflineBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md border border-amber-500 bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900 shadow-md">
      Offline mode active. New updates are queued and will sync when connection returns.
    </div>
  )
}

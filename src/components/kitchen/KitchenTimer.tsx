"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface KitchenTimerProps {
  startTime: string | Date
}

export function KitchenTimer({ startTime }: KitchenTimerProps) {
  const [elapsed, setElapsed] = useState("")
  const [urgency, setUrgency] = useState<"normal" | "warning" | "urgent">("normal")

  useEffect(() => {
    function update() {
      const start = new Date(startTime).getTime()
      const now = Date.now()
      const diffMs = now - start
      const minutes = Math.floor(diffMs / 60000)
      const seconds = Math.floor((diffMs % 60000) / 1000)
      setElapsed(`${minutes}:${seconds.toString().padStart(2, "0")}`)

      if (minutes >= 15) setUrgency("urgent")
      else if (minutes >= 10) setUrgency("warning")
      else setUrgency("normal")
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const colorClass = {
    normal: "text-muted-foreground",
    warning: "text-yellow-600",
    urgent: "text-red-600 animate-pulse",
  }

  return (
    <span className={`flex items-center gap-1 text-sm font-mono ${colorClass[urgency]}`}>
      <Clock className="h-3 w-3" />
      {elapsed}
    </span>
  )
}

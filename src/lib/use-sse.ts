"use client"

import { useEffect, useState, useRef, useCallback } from "react"

export function useSSE<T>(
  url: string,
  initialData: T
): { data: T; connected: boolean; error: Error | null } {
  const [data, setData] = useState<T>(initialData)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000

  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      setError(null)
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        setData(parsed)
        setError(null)
      } catch (err) {
        console.error("SSE parse error:", err)
        setError(new Error("Failed to parse SSE data"))
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      setConnected(false)

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
        reconnectAttemptsRef.current += 1
        setError(new Error(`Connection lost. Reconnecting in ${delay / 1000}s...`))
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      } else {
        setError(new Error("Max reconnection attempts reached. Please refresh the page."))
      }
    }
  }, [url])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connect])

  return { data, connected, error }
}

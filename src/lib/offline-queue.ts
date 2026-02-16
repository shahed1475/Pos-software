import {
  addQueuedRequest,
  deleteQueuedRequest,
  listQueuedRequests,
  QueuedRequest,
} from "@/lib/indexeddb"

export async function queueApiRequest(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = String(input)
  const method = String(init.method || "GET").toUpperCase()

  const queueable = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  if (navigator.onLine || !queueable) {
    return fetch(input, init)
  }

  await addQueuedRequest({
    url,
    method,
    body: init.body ? String(init.body) : undefined,
    headers: normalizeHeaders(init.headers),
    createdAt: Date.now(),
  })

  return new Response(
    JSON.stringify({
      queued: true,
      message: "Request queued offline and will sync when connection is restored.",
    }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    }
  )
}

export async function replayOfflineQueue() {
  if (!navigator.onLine) return { processed: 0, failed: 0 }

  const queued = await listQueuedRequests()
  let processed = 0
  let failed = 0

  for (const request of queued) {
    if (!request.id) continue
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
      if (response.ok || response.status < 500) {
        await deleteQueuedRequest(request.id)
        processed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { processed, failed }
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined
  if (headers instanceof Headers) return Object.fromEntries(headers.entries())
  if (Array.isArray(headers)) return Object.fromEntries(headers)
  return headers
}

export type { QueuedRequest }

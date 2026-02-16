const CACHE_NAME = "fluxpos-static-v2"
const OFFLINE_URL = "/offline"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const request = event.request
  const isNavigation = request.mode === "navigate"
  const url = new URL(request.url)
  const isApiRequest = url.pathname.startsWith("/api/")
  const isAuthRequest = url.pathname.startsWith("/api/auth/")

  // Never cache API/auth responses to avoid stale sessions and data.
  if (isApiRequest || isAuthRequest) {
    event.respondWith(fetch(request))
    return
  }

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Cache only successful same-origin static assets.
        const destination = request.destination
        const shouldCache =
          response.ok &&
          url.origin === self.location.origin &&
          ["script", "style", "image", "font"].includes(destination)

        if (shouldCache) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    })
  )
})

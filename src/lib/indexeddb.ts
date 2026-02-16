const DB_NAME = "fluxpos-offline"
const STORE_NAME = "request-queue"
const DB_VERSION = 1

export interface QueuedRequest {
  id?: number
  url: string
  method: string
  body?: string
  headers?: Record<string, string>
  createdAt: number
}

function isBrowser() {
  return typeof window !== "undefined" && "indexedDB" in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) return reject(new Error("IndexedDB is only available in browser"))
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"))
  })
}

export async function addQueuedRequest(request: QueuedRequest): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const op = store.add(request)
    op.onsuccess = () => resolve(Number(op.result))
    op.onerror = () => reject(op.error || new Error("Failed to queue request"))
  })
}

export async function listQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const op = store.getAll()
    op.onsuccess = () => resolve((op.result || []) as QueuedRequest[])
    op.onerror = () => reject(op.error || new Error("Failed to read queue"))
  })
}

export async function deleteQueuedRequest(id: number): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const op = store.delete(id)
    op.onsuccess = () => resolve()
    op.onerror = () => reject(op.error || new Error("Failed to delete queued request"))
  })
}

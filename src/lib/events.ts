// Central event publisher for real-time order events
type EventHandler = (event: OrderEvent) => void

export interface OrderEvent {
  type: "ORDER_CREATED" | "ORDER_UPDATED" | "ITEM_STATUS_CHANGED" | "ORDER_READY" | "ORDER_PICKED_UP" | "VENDOR_THROTTLED"
  orderId?: string
  vendorId?: string
  tenantId?: string
  branchId?: string
  data?: any
  timestamp: number
}

class EventPublisher {
  private handlers = new Map<string, Set<EventHandler>>()

  subscribe(channel: string, handler: EventHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
    }
    this.handlers.get(channel)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.handlers.get(channel)?.delete(handler)
    }
  }

  publish(channel: string, event: OrderEvent) {
    const handlers = this.handlers.get(channel)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch (err) {
          console.error("Event handler error:", err)
        }
      })
    }

    // Also publish to wildcard listeners
    const wildcardHandlers = this.handlers.get("*")
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => {
        try {
          handler(event)
        } catch (err) {
          console.error("Wildcard handler error:", err)
        }
      })
    }
  }

  // Convenience methods
  publishOrderCreated(params: { orderId: string; vendorId?: string; tenantId?: string; branchId?: string }) {
    const event: OrderEvent = { type: "ORDER_CREATED", ...params, timestamp: Date.now() }
    this.publish(`tenant:${params.tenantId}`, event)
    if (params.vendorId) this.publish(`vendor:${params.vendorId}`, event)
    this.publish(`branch:${params.branchId}`, event)
  }

  publishOrderUpdated(params: { orderId: string; vendorId?: string; tenantId?: string; branchId?: string; data?: any }) {
    const event: OrderEvent = { type: "ORDER_UPDATED", ...params, timestamp: Date.now() }
    this.publish(`tenant:${params.tenantId}`, event)
    if (params.vendorId) this.publish(`vendor:${params.vendorId}`, event)
  }

  publishOrderReady(params: { orderId: string; vendorId?: string; tenantId?: string }) {
    const event: OrderEvent = { type: "ORDER_READY", ...params, timestamp: Date.now() }
    this.publish(`tenant:${params.tenantId}`, event)
    if (params.vendorId) this.publish(`vendor:${params.vendorId}`, event)
    this.publish("pickup", event)
  }
}

// Singleton
export const eventPublisher = new EventPublisher()

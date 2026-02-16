// Notification dispatcher abstraction for email/SMS
// Currently stubs — integrations to be added per deployment

export type NotificationChannel = "EMAIL" | "SMS" | "PUSH"

export interface NotificationPayload {
  to: string
  channel: NotificationChannel
  subject?: string
  body: string
  templateId?: string
  data?: Record<string, any>
}

export interface NotificationResult {
  success: boolean
  channel: NotificationChannel
  error?: string
}

export async function sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
  switch (payload.channel) {
    case "EMAIL":
      return sendEmail(payload)
    case "SMS":
      return sendSMS(payload)
    case "PUSH":
      return sendPush(payload)
    default:
      return { success: false, channel: payload.channel, error: "Unknown channel" }
  }
}

async function sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
  // Stub — integrate with SendGrid, SES, Resend, etc.
  console.log(`[EMAIL] To: ${payload.to}, Subject: ${payload.subject}, Body: ${payload.body}`)
  return { success: true, channel: "EMAIL" }
}

async function sendSMS(payload: NotificationPayload): Promise<NotificationResult> {
  // Stub — integrate with Twilio, Vonage, etc.
  console.log(`[SMS] To: ${payload.to}, Body: ${payload.body}`)
  return { success: true, channel: "SMS" }
}

async function sendPush(payload: NotificationPayload): Promise<NotificationResult> {
  // Stub — integrate with FCM, APNs, etc.
  console.log(`[PUSH] To: ${payload.to}, Body: ${payload.body}`)
  return { success: true, channel: "PUSH" }
}

// Convenience functions
export async function notifyOrderReady(params: {
  customerPhone?: string | null
  customerName?: string | null
  orderNumber: number
  pickupCode?: string | null
  vendorName?: string
}) {
  if (params.customerPhone) {
    await sendNotification({
      to: params.customerPhone,
      channel: "SMS",
      body: `Your order #${params.orderNumber} from ${params.vendorName || "us"} is ready! ${params.pickupCode ? `Pickup code: ${params.pickupCode}` : ""}`,
    })
  }
}

export async function notifyVendorNewOrder(params: {
  vendorContactEmail?: string | null
  vendorName: string
  orderCount: number
}) {
  if (params.vendorContactEmail) {
    await sendNotification({
      to: params.vendorContactEmail,
      channel: "EMAIL",
      subject: "New Order Received",
      body: `${params.vendorName} has received a new order. You now have ${params.orderCount} active orders.`,
    })
  }
}

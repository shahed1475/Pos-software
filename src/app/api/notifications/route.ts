import { NextRequest, NextResponse } from "next/server"
import { getAuthSession, unauthorizedResponse } from "@/lib/auth-utils"
import { sendNotification, NotificationPayload } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session) return unauthorizedResponse()

    const body = await request.json() as NotificationPayload
    const result = await sendNotification(body)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}

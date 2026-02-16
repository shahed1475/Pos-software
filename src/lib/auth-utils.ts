import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { NextResponse } from "next/server"

export interface AuthSession {
  staffId: string
  role: string
  tenantId: string
  branchId: string
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const user = session.user as any
  return {
    staffId: user.id,
    role: user.role,
    tenantId: user.tenantId || "",
    branchId: user.branchId || "",
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

// PIN brute-force lockout: max attempts per IP within cooldown window
const PIN_MAX_ATTEMPTS = 5
const PIN_LOCKOUT_SECONDS = 300 // 5 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()

function checkLockout(key: string): { locked: boolean; remainingSeconds: number } {
  const entry = loginAttempts.get(key)
  if (!entry) return { locked: false, remainingSeconds: 0 }
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(key)
    return { locked: false, remainingSeconds: 0 }
  }
  if (entry.count >= PIN_MAX_ATTEMPTS) {
    return { locked: true, remainingSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) }
  }
  return { locked: false, remainingSeconds: 0 }
}

function recordFailedAttempt(key: string) {
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: 0 }
  entry.count++
  if (entry.count >= PIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + PIN_LOCKOUT_SECONDS * 1000
  }
  loginAttempts.set(key, entry)
}

function clearAttempts(key: string) {
  loginAttempts.delete(key)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "PIN",
      credentials: {
        pin: { label: "PIN", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.pin) return null

        // Rate limit by tenant slug (or "global" for non-tenant logins)
        const lockoutKey = `pin:${credentials.tenantSlug || "global"}`
        const { locked } = checkLockout(lockoutKey)
        if (locked) return null

        const where: any = { active: true }
        let tenantId: string | undefined
        let branchId: string | undefined

        if (credentials.tenantSlug) {
          const tenant = await prisma.tenant.findUnique({
            where: { slug: credentials.tenantSlug },
            include: { branches: { where: { active: true }, take: 1 } },
          })
          if (!tenant || !tenant.active) return null
          tenantId = tenant.id
          branchId = tenant.branches[0]?.id
          where.tenantId = tenant.id
        }

        const staffMembers = await prisma.staff.findMany({ where })

        for (const staff of staffMembers) {
          const isValid = await bcrypt.compare(credentials.pin, staff.pin)
          if (isValid) {
            clearAttempts(lockoutKey)
            const userRole = String(staff.role)
            const userTenantId = String(staff.tenantId || tenantId || "")
            const userBranchId = String(staff.branchId || branchId || "")
            return {
              id: staff.id,
              name: staff.name,
              email: userRole + "|" + userTenantId + "|" + userBranchId,
            }
          }
        }

        recordFailedAttempt(lockoutKey)
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.staffId = user.id
        const parts = (user.email || "").split("|")
        token.staffRole = parts[0] || ""
        token.staffTenantId = parts[1] || ""
        token.staffBranchId = parts[2] || ""
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as any
        user.id = token.staffId || ""
        user.role = token.staffRole || ""
        user.tenantId = token.staffTenantId || ""
        user.branchId = token.staffBranchId || ""
        user.email = null
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

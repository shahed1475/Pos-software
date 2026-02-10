import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "PIN",
      credentials: {
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.pin) return null

        const staffMembers = await prisma.staff.findMany({
          where: { active: true },
        })

        for (const staff of staffMembers) {
          const isValid = await bcrypt.compare(credentials.pin, staff.pin)
          if (isValid) {
            return {
              id: staff.id,
              name: staff.name,
              role: staff.role,
            }
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.staffId = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.staffId as string
        (session.user as any).role = token.role
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

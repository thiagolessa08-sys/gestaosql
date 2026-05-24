/**
 * Edge-safe Auth.js config — sem imports Node.js (sem Prisma, sem pg).
 * Usado exclusivamente pelo middleware (Edge Runtime).
 * O JWT já carrega id, isSystemAdmin e mustChangePassword no token,
 * por isso não precisamos de nenhum provider aqui.
 */
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

const edgeAuthConfig: NextAuthConfig = {
  providers: [], // nenhum provider — só valida o JWT existente
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.isSystemAdmin = (user as { isSystemAdmin: boolean }).isSystemAdmin
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.isSystemAdmin = token.isSystemAdmin as boolean
      session.user.mustChangePassword = token.mustChangePassword as boolean
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
}

export const { auth } = NextAuth(edgeAuthConfig)

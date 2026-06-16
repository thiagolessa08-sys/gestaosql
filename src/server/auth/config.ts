import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/server/db"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // necessário para deployments atrás de proxy (Railway, Vercel)
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findFirst({
          where: {
            email: { equals: parsed.data.email.trim(), mode: "insensitive" },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            isSystemAdmin: true,
            perfil: true,
            mustChangePassword: true,
          },
        })
        if (!user) return null

        const valid = await compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isSystemAdmin: user.isSystemAdmin,
          perfil: user.perfil,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!
        token.isSystemAdmin = (user as { isSystemAdmin: boolean }).isSystemAdmin
        token.perfil = (user as { perfil: import("@prisma/client").PerfilAcesso }).perfil
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword
      }
      // Permite atualizar mustChangePassword no JWT via useSession().update()
      if (trigger === "update" && session?.mustChangePassword !== undefined) {
        token.mustChangePassword = session.mustChangePassword as boolean
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.isSystemAdmin = token.isSystemAdmin as boolean
      session.user.perfil = token.perfil as import("@prisma/client").PerfilAcesso
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
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
})

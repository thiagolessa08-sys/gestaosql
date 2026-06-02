import { DefaultSession } from "next-auth"
import type { PerfilAcesso } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isSystemAdmin: boolean
      perfil: PerfilAcesso
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isSystemAdmin: boolean
    perfil: PerfilAcesso
    mustChangePassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isSystemAdmin: boolean
    perfil: PerfilAcesso
    mustChangePassword: boolean
  }
}

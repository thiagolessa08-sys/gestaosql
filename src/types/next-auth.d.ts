import { DefaultSession } from "next-auth"
import type { PerfilAcesso } from "@prisma/client"
// PerfilAcesso: MEMBRO_PROJETO | MEMBRO_COMERCIAL | ADMIN_PROJETO | ADMIN_COMERCIAL
// Admin Total = isSystemAdmin:true (perfil não importa)

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

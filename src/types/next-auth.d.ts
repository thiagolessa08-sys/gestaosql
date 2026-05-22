import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      isSystemAdmin: boolean
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }

  interface User {
    isSystemAdmin: boolean
    mustChangePassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    isSystemAdmin: boolean
    mustChangePassword: boolean
  }
}

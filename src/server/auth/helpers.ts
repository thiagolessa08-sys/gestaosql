import { auth } from "@/server/auth/config"
import { redirect } from "next/navigation"

export async function getRequiredSession() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session
}

export async function getOptionalSession() {
  return auth()
}

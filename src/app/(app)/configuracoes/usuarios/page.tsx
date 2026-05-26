import { redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findAllUsers } from "@/server/repositories/users"
import { UserManagement } from "./_components/UserManagement"

export default async function UsuariosPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!session.user.isSystemAdmin) redirect("/configuracoes/perfil")

  const users = await findAllUsers()

  return <UserManagement users={users} currentUserId={session.user.id} />
}

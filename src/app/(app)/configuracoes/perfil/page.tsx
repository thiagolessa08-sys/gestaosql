import { redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findUserById } from "@/server/repositories/users"
import { ProfileForm } from "./_components/ProfileForm"

export default async function PerfilPage() {
  const session = await auth()
  if (!session?.user.id) redirect("/login")

  const user = await findUserById(session.user.id)
  if (!user) redirect("/login")

  return (
    <ProfileForm
      initialName={user.name}
      initialAvatarUrl={user.avatarUrl ?? null}
    />
  )
}

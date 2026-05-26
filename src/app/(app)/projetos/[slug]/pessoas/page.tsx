import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findMembersByProjectId } from "@/server/repositories/members"
import { findAllUsers } from "@/server/repositories/users"
import { getMemberRole } from "@/server/permissions"
import { MemberList } from "@/components/projects/MemberList"
import { AddMemberForm } from "@/components/projects/AddMemberForm"
import { Separator } from "@/components/ui/separator"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PessoasPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const [members, allUsers] = await Promise.all([
    findMembersByProjectId(project.id),
    findAllUsers(),
  ])
  const currentRole = await getMemberRole(session.user.id, project.id)

  const canManage =
    session.user.isSystemAdmin ||
    currentRole === "ADMIN"

  // Users not yet members of this project
  const memberUserIds = new Set(members.map((m) => m.user.id))
  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Membros</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {project.name} · {members.length}{" "}
          {members.length === 1 ? "membro" : "membros"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MemberList
            members={members}
            projectId={project.id}
            currentUserId={session.user.id}
            canManage={canManage}
          />
        </div>

        {canManage && (
          <div>
            <AddMemberForm
              projectId={project.id}
              availableUsers={availableUsers}
            />
          </div>
        )}
      </div>

      <Separator className="my-6" />

      <p className="text-xs text-muted-foreground">
        Somente administradores podem convidar e gerenciar membros.
      </p>
    </div>
  )
}

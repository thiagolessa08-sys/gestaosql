import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findBacklogCards } from "@/server/repositories/cards"
import { findMembersByProjectId } from "@/server/repositories/members"
import { findSprintsByProjectId } from "@/server/repositories/sprints"
import { findTagsByProjectId } from "@/server/repositories/tags"
import { getMemberRole } from "@/server/permissions"
import { isAdminProjetos } from "@/lib/acesso"
import { BacklogList } from "@/components/backlog/BacklogList"
import { CardForm } from "@/components/cards/CardForm"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ card?: string }>
}

export default async function BacklogPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const { card: openCardId } = await searchParams
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const currentRole = await getMemberRole(session.user.id, project.id)
  const canCreate = !!currentRole
  const canMove = !!currentRole
  const canArchive =
    isAdminProjetos(session.user) || currentRole === "ADMIN" || currentRole === "SCRUM_MASTER"

  const isMemberOnly =
    !isAdminProjetos(session.user) && currentRole === "MEMBER"

  const [cards, members, allTags, sprints] = await Promise.all([
    findBacklogCards(project.id, isMemberOnly ? session.user.id : undefined),
    findMembersByProjectId(project.id),
    findTagsByProjectId(project.id),
    findSprintsByProjectId(project.id),
  ])

  const targetableSprints = sprints
    .filter((s) => s.status === "PLANNED" || s.status === "ACTIVE")
    .map((s) => ({ id: s.id, name: s.name, status: s.status }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {project.name} · {cards.length} {cards.length === 1 ? "card" : "cards"} no backlog
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BacklogList
            cards={cards}
            members={members}
            allTags={allTags}
            sprints={targetableSprints}
            canMove={canMove}
            canArchive={canArchive}
            currentUserId={session.user.id}
            openCardId={openCardId}
          />
        </div>

        {canCreate && (
          <div>
            <CardForm
              projectId={project.id}
              members={members}
            />
          </div>
        )}
      </div>
    </div>
  )
}

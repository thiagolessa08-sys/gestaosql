import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findBacklogCards } from "@/server/repositories/cards"
import { findMembersByProjectId } from "@/server/repositories/members"
import { findSprintsByProjectId } from "@/server/repositories/sprints"
import { getMemberRole } from "@/server/permissions"
import { CardForm } from "@/components/cards/CardForm"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BacklogPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const [cards, members, sprints] = await Promise.all([
    findBacklogCards(project.id),
    findMembersByProjectId(project.id),
    findSprintsByProjectId(project.id),
  ])

  const currentRole = await getMemberRole(session.user.id, project.id)
  const canCreate = !!currentRole

  const plannedSprints = sprints.filter((s) => s.status === "PLANNED" || s.status === "ACTIVE")

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {project.name} · {cards.length} {cards.length === 1 ? "card" : "cards"} no backlog
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {cards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum card no backlog.</p>
            </div>
          )}
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card.title}</p>
                {card.assignee && (
                  <p className="text-xs text-muted-foreground">{card.assignee.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={card.priority} />
                {card.storyPoints != null && (
                  <Badge variant="outline" className="text-xs">{card.storyPoints} pts</Badge>
                )}
                {card._count.comments > 0 && (
                  <span className="text-xs text-muted-foreground">{card._count.comments} comentários</span>
                )}
              </div>
            </div>
          ))}
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

import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findSprintById } from "@/server/repositories/sprints"
import { findCardsBySprintId } from "@/server/repositories/cards"
import { findMembersByProjectId } from "@/server/repositories/members"
import { findTagsByProjectId } from "@/server/repositories/tags"
import { findMainActivitiesBySprintId } from "@/server/repositories/mainActivities"
import { getMemberRole } from "@/server/permissions"
import { KanbanBoard } from "@/components/board/KanbanBoard"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  params: Promise<{ slug: string; id: string }>
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planejada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
}

export default async function BoardPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug, id } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const sprint = await findSprintById(id)
  if (!sprint || sprint.projectId !== project.id) notFound()

  const role = await getMemberRole(session.user.id, project.id)
  // Members only see cards assigned to them; admins/scrum masters see all
  const isMemberOnly =
    !session.user.isSystemAdmin && role === "MEMBER"

  const [rawCards, members, allTags, activities] = await Promise.all([
    findCardsBySprintId(id, isMemberOnly ? session.user.id : undefined),
    findMembersByProjectId(project.id),
    findTagsByProjectId(project.id),
    findMainActivitiesBySprintId(id),
  ])

  const cards = rawCards.map(({ checklists, ...rest }) => ({
    ...rest,
    checklistsDone: checklists.length,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{sprint.name}</h1>
            <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"}>
              {STATUS_LABELS[sprint.status] ?? sprint.status}
            </Badge>
          </div>
          {sprint.goal && (
            <p className="text-sm text-muted-foreground mt-1">{sprint.goal}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projetos/${slug}/sprints`}>← Sprints</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projetos/${slug}/backlog`}>Backlog</Link>
          </Button>
        </div>
      </div>

      <KanbanBoard
        initialCards={cards}
        members={members}
        allTags={allTags}
        currentUserId={session.user.id}
        projectId={project.id}
        sprintId={id}
        sprintName={sprint.name}
        activities={activities}
      />
    </div>
  )
}

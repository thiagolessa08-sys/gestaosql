import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findSprintsByProjectId } from "@/server/repositories/sprints"
import { getMemberRole } from "@/server/permissions"
import { SprintList } from "@/components/sprints/SprintList"
import { CreateSprintForm } from "@/components/sprints/CreateSprintForm"

interface Props {
  params: Promise<{ slug: string }>
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planejada",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PLANNED: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

export default async function SprintsPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const sprints = await findSprintsByProjectId(project.id)
  const currentRole = await getMemberRole(session.user.id, project.id)
  const canManage = session.user.isSystemAdmin || currentRole === "ADMIN" || currentRole === "SCRUM_MASTER"

  const activeSprint = sprints.find((s) => s.status === "ACTIVE") ?? null
  const plannedSprints = sprints.filter((s) => s.status === "PLANNED")
  const pastSprints = sprints.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED")

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sprints</h1>
          <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeSprint && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Sprint Ativa</h2>
              <SprintList
                sprints={[activeSprint]}
                projectId={project.id}
                projectSlug={slug}
                canManage={canManage}
                plannedSprints={plannedSprints}
                statusLabels={STATUS_LABELS}
                statusVariants={STATUS_VARIANTS}
              />
            </div>
          )}

          {plannedSprints.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Planejadas</h2>
              <SprintList
                sprints={plannedSprints}
                projectId={project.id}
                projectSlug={slug}
                canManage={canManage}
                plannedSprints={plannedSprints}
                statusLabels={STATUS_LABELS}
                statusVariants={STATUS_VARIANTS}
                hasActiveSprint={!!activeSprint}
              />
            </div>
          )}

          {pastSprints.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Histórico</h2>
              <SprintList
                sprints={pastSprints}
                projectId={project.id}
                projectSlug={slug}
                canManage={false}
                plannedSprints={[]}
                statusLabels={STATUS_LABELS}
                statusVariants={STATUS_VARIANTS}
              />
            </div>
          )}

          {sprints.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p>Nenhuma sprint criada ainda.</p>
            </div>
          )}
        </div>

        {canManage && (
          <div>
            <CreateSprintForm projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  )
}

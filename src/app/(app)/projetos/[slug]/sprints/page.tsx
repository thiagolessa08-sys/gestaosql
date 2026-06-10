import { notFound, redirect } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { findSprintsWithCardStatsByProjectId } from "@/server/repositories/sprints"
import { getMemberRole } from "@/server/permissions"
import { isAdminProjetos } from "@/lib/acesso"
import { SprintList } from "@/components/sprints/SprintList"
import { CreateSprintForm } from "@/components/sprints/CreateSprintForm"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SprintsPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const sprints = await findSprintsWithCardStatsByProjectId(project.id)
  const currentRole = await getMemberRole(session.user.id, project.id)
  const canManage =
    isAdminProjetos(session.user) || currentRole === "ADMIN" || currentRole === "SCRUM_MASTER"

  const activeSprint = sprints.find((s) => s.status === "ACTIVE") ?? null
  const plannedSprints = sprints.filter((s) => s.status === "PLANNED")
  const pastSprints = sprints.filter(
    (s) => s.status === "COMPLETED" || s.status === "CANCELLED"
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sprints</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {project.name} · {sprints.length} {sprints.length === 1 ? "sprint no total" : "sprints no total"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sprint list */}
        <div className="lg:col-span-2 space-y-8">

          {/* Sprint ativa */}
          {activeSprint && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Sprint ativa
              </p>
              <SprintList
                sprints={[activeSprint]}
                projectId={project.id}
                projectSlug={slug}
                canManage={canManage}
                plannedSprints={plannedSprints}
                hasActiveSprint={true}
              />
            </div>
          )}

          {/* Planejadas */}
          {plannedSprints.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Planejadas
              </p>
              <SprintList
                sprints={plannedSprints}
                projectId={project.id}
                projectSlug={slug}
                canManage={canManage}
                plannedSprints={plannedSprints}
                hasActiveSprint={!!activeSprint}
              />
            </div>
          )}

          {/* Encerradas */}
          {pastSprints.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Encerradas
              </p>
              <SprintList
                sprints={pastSprints}
                projectId={project.id}
                projectSlug={slug}
                canManage={false}
                plannedSprints={[]}
                hasActiveSprint={!!activeSprint}
              />
            </div>
          )}

          {sprints.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p>Nenhuma sprint criada ainda.</p>
            </div>
          )}
        </div>

        {/* Form */}
        {canManage && (
          <div>
            <CreateSprintForm projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  )
}

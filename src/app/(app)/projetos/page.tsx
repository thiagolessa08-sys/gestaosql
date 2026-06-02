import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/server/auth/config"
import { getProjectsForUser, getArchivedProjects } from "@/server/services/projects"
import { ProjectsTabs } from "@/components/projects/ProjectsTabs"
import { Button } from "@/components/ui/button"

export default async function ProjetosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isAdmin = session.user.isSystemAdmin
  const [projects, arquivados] = await Promise.all([
    getProjectsForUser(session.user.id, isAdmin),
    isAdmin ? getArchivedProjects() : Promise.resolve([]),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects.length === 0
              ? "Nenhum projeto ainda."
              : `${projects.length} ${projects.length === 1 ? "projeto" : "projetos"}`}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/projetos/novo">Novo projeto</Link>
          </Button>
        )}
      </div>

      <ProjectsTabs ativos={projects} arquivados={arquivados} isSystemAdmin={isAdmin} />
    </div>
  )
}

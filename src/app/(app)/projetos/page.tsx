import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/server/auth/config"
import { getProjectsForUser } from "@/server/services/projects"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { Button } from "@/components/ui/button"

export default async function ProjetosPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const projects = await getProjectsForUser(session.user.id, session.user.isSystemAdmin)

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
        {session.user.isSystemAdmin && (
          <Button asChild>
            <Link href="/projetos/novo">Novo projeto</Link>
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Você ainda não participa de nenhum projeto.</p>
          {session.user.isSystemAdmin && (
            <p className="text-sm mt-2">
              <Link href="/projetos/novo" className="underline">
                Crie o primeiro projeto
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

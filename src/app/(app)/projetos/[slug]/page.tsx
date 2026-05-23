import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.archivedAt && <Badge variant="secondary">Arquivado</Badge>}
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projetos/${slug}/pessoas`}>Membros</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projetos/${slug}/configuracoes`}>Configurações</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{project._count.members}</p>
          <p className="text-sm text-muted-foreground">Membros</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{project._count.sprints}</p>
          <p className="text-sm text-muted-foreground">Sprints</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{project._count.cards}</p>
          <p className="text-sm text-muted-foreground">Cards</p>
        </div>
      </div>

      <div className="text-muted-foreground text-sm">
        <p>Board kanban e sprints serão implementados nas próximas etapas.</p>
      </div>
    </div>
  )
}

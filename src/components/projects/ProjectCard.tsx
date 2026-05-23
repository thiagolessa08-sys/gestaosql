import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    slug: string
    description: string | null
    archivedAt: Date | null
    _count: { members: number; sprints: number; cards: number }
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projetos/${project.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
            {project.archivedAt && (
              <Badge variant="secondary" className="shrink-0">Arquivado</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {project.description}
            </p>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{project._count.members} {project._count.members === 1 ? "membro" : "membros"}</span>
            <span>{project._count.sprints} {project._count.sprints === 1 ? "sprint" : "sprints"}</span>
            <span>{project._count.cards} {project._count.cards === 1 ? "card" : "cards"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

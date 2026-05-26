import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { getProjectColor, getUserAvatarColor, getInitials } from "@/lib/project-colors"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    slug: string
    description: string | null
    archivedAt: Date | null
    _count: { members: number; sprints: number; cards: number }
    members: Array<{ user: { name: string } }>
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const color = getProjectColor(project.slug)

  return (
    <Link href={`/projetos/${project.slug}`} className="block group">
      <div className="bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-all duration-200 group-hover:-translate-y-0.5 h-full flex flex-col">
        {/* Color accent strip */}
        <div className="h-1.5 w-full" style={{ background: color.accent }} />

        <div className="p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ background: color.light, color: color.text }}
            >
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            {project.archivedAt && (
              <Badge variant="secondary" className="shrink-0 text-xs">Arquivado</Badge>
            )}
          </div>

          {/* Name & description */}
          <div className="flex-1 mb-4">
            <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{project.name}</h3>
            {project.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem descrição</p>
            )}
          </div>

          {/* Footer: avatars + counts */}
          <div className="flex items-center justify-between">
            {/* Member avatars */}
            <div className="flex items-center">
              {project.members.slice(0, 4).map((m, i) => {
                const c = getUserAvatarColor(m.user.name)
                const initials = getInitials(m.user.name)
                return (
                  <div
                    key={i}
                    title={m.user.name}
                    className="w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-xs font-semibold -ml-1.5 first:ml-0"
                    style={{ background: c.light, color: c.text }}
                  >
                    {initials}
                  </div>
                )
              })}
              {project._count.members > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium -ml-1.5">
                  +{project._count.members - 4}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: color.accent }}
                />
                {project._count.sprints} sprints
              </span>
              <span>{project._count.cards} cards</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

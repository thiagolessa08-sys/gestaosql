import Link from "next/link"
import { Users, Zap, LayoutList, MoreHorizontal } from "lucide-react"
import { getProjectColor, getUserAvatarColor, getInitials } from "@/lib/project-colors"

export interface ProjectListItem {
  id: string
  name: string
  slug: string
  description: string | null
  archivedAt: Date | null
  _count: { members: number; sprints: number; cards: number }
  members: Array<{ user: { name: string } }>
  sprints: Array<{ name: string }>   // active sprints only
  cards: Array<{ id: string }>       // done cards only
}

interface ProjectCardProps {
  project: ProjectListItem
}

export function ProjectCard({ project }: ProjectCardProps) {
  const color = getProjectColor(project.slug)
  const iconInitials = project.slug.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase()
  const totalCards = project._count.cards
  const doneCards = project.cards.length
  const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0
  const activeSprint = project.sprints[0] ?? null

  return (
    <div className="relative bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-all duration-200 h-full flex flex-col">

      {/* Settings button — absolutamente posicionado FORA do link principal, sem aninhamento */}
      <Link
        href={`/projetos/${project.slug}/configuracoes`}
        className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors"
        title="Configurações do projeto"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Link>

      {/* Link principal — envolve TODO o conteúdo do card */}
      <Link href={`/projetos/${project.slug}`} className="flex flex-col flex-1">
        {/* Color accent strip */}
        <div className="h-1.5 w-full shrink-0" style={{ background: color.accent }} />

        <div className="p-5 flex flex-col flex-1 gap-4">

          {/* Header: icon + name (sem o botão ⋯) */}
          <div className="flex items-start gap-3 min-w-0 pr-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ background: color.light, color: color.text }}
            >
              {iconInitials}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {project.description}
                </p>
              )}
              {project.archivedAt && (
                <span className="inline-block mt-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  Arquivado
                </span>
              )}
            </div>
          </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Progresso do projeto</span>
            <span className="text-xs text-muted-foreground">
              {progressPct}% · {doneCards}/{totalCards} cards
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: color.accent }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {project._count.members}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {project._count.sprints} {project._count.sprints === 1 ? "sprint" : "sprints"}
          </span>
          <span className="flex items-center gap-1.5">
            <LayoutList className="w-3.5 h-3.5" />
            {totalCards} {totalCards === 1 ? "card" : "cards"}
          </span>
        </div>

        {/* Bottom: avatars + active sprint */}
        <div className="flex items-center justify-between">
          {/* Member avatars */}
          <div className="flex items-center">
            {project.members.slice(0, 4).map((m, i) => {
              const c = getUserAvatarColor(m.user.name)
              return (
                <div
                  key={i}
                  title={m.user.name}
                  className="w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-xs font-semibold -ml-1.5 first:ml-0"
                  style={{ background: c.light, color: c.text }}
                >
                  {getInitials(m.user.name)}
                </div>
              )
            })}
            {project._count.members > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium -ml-1.5">
                +{project._count.members - 4}
              </div>
            )}
          </div>

          {/* Active sprint badge */}
          {activeSprint ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {activeSprint.name} ativa
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Sem sprint ativa</span>
          )}
        </div>

        </div>

      </Link>
    </div>
  )
}

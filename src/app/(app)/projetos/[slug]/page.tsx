import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { getProjectCardStats } from "@/server/repositories/projects"
import { findSprintsWithProgressByProjectId } from "@/server/repositories/sprints"
import { findAuditLogsByProject } from "@/server/repositories/audit"
import { getMemberRole } from "@/server/permissions"
import { getProjectColor, getInitials } from "@/lib/project-colors"
import { Button } from "@/components/ui/button"
import {
  Users,
  Zap,
  LayoutList,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  Plus,
  Settings,
  Activity,
} from "lucide-react"
import type { AuditAction, SprintStatus } from "@prisma/client"

interface Props {
  params: Promise<{ slug: string }>
}

const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  PLANNED: "Planejada",
  ACTIVE: "Ativa",
  COMPLETED: "Encerrada",
  CANCELLED: "Cancelada",
}

const SPRINT_STATUS_COLORS: Record<SprintStatus, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
}

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "criou",
  UPDATE: "atualizou",
  DELETE: "removeu",
  MOVE: "moveu",
  ASSIGN: "atribuiu",
  COMMENT: "comentou em",
  INVITE: "convidou",
  JOIN: "entrou no projeto",
  REMOVE_MEMBER: "removeu membro de",
  START_SPRINT: "iniciou sprint",
  END_SPRINT: "encerrou sprint",
}

const ENTITY_LABELS: Record<string, string> = {
  card: "card",
  sprint: "sprint",
  member: "membro",
}

function getActivityIcon(action: AuditAction) {
  switch (action) {
    case "MOVE":
      return <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
    case "COMMENT":
      return <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
    case "CREATE":
      return <Plus className="w-3.5 h-3.5 text-emerald-500" />
    case "END_SPRINT":
    case "UPDATE":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    default:
      return <Activity className="w-3.5 h-3.5 text-muted-foreground" />
  }
}

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return "agora"
  if (diffMin < 60) return `${diffMin}min atrás`
  if (diffHour < 24) return `${diffHour}h atrás`
  if (diffDay === 1) return "1d atrás"
  return `${diffDay}d atrás`
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export default async function ProjectPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const role = await getMemberRole(session.user.id, project.id)
  const canManage =
    session.user.isSystemAdmin || role === "ADMIN" || role === "SCRUM_MASTER"
  const canViewAudit =
    session.user.isSystemAdmin || role === "ADMIN" || role === "SCRUM_MASTER"

  const [sprints, cardStats, auditLogs] = await Promise.all([
    findSprintsWithProgressByProjectId(project.id),
    getProjectCardStats(project.id),
    findAuditLogsByProject(project.id, 7),
  ])

  const activeSprint = sprints.find((s) => s.status === "ACTIVE") ?? null
  const progressPct =
    cardStats.total > 0
      ? Math.round((cardStats.done / cardStats.total) * 100)
      : 0

  const color = getProjectColor(project.slug)
  const iconInitials = project.slug.replace(/[^a-z]/g, "").slice(0, 2).toUpperCase()

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projetos" className="hover:text-foreground transition-colors">Projetos</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-lg font-bold"
            style={{ background: color.light, color: color.text }}
          >
            {iconInitials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {project.description && `${project.description} · `}
              atualizado {formatRelativeTime(project.updatedAt)}
            </p>
          </div>
        </div>
        {activeSprint && (
          <Button asChild className="shrink-0">
            <Link href={`/projetos/${slug}/sprints/${activeSprint.id}/board`}>
              Abrir board ativo
            </Link>
          </Button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b">
        {[
          { label: "Visão geral", href: `/projetos/${slug}`, active: true },
          { label: `Sprints ${project._count.sprints}`, href: `/projetos/${slug}/sprints` },
          { label: "Backlog", href: `/projetos/${slug}/backlog` },
          { label: `Membros ${project._count.members}`, href: `/projetos/${slug}/pessoas` },
          { label: "Configurações", href: `/projetos/${slug}/configuracoes` },
        ].map(({ label, href, active }) => (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Membros */}
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membros</p>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{project._count.members}</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link href={`/projetos/${slug}/pessoas`} className="hover:text-primary transition-colors">
              Ver membros →
            </Link>
          </p>
        </div>

        {/* Sprints */}
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sprints</p>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{project._count.sprints}</p>
          <p className="text-xs mt-1">
            {activeSprint ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {activeSprint.name} ativa
              </span>
            ) : (
              <span className="text-muted-foreground">Sem sprint ativa</span>
            )}
          </p>
        </div>

        {/* Cards */}
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cards</p>
            <LayoutList className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{cardStats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {cardStats.thisWeek > 0
              ? `+${cardStats.thisWeek} esta semana`
              : "Nenhum novo esta semana"}
          </p>
        </div>

        {/* Progresso */}
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progresso</p>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-bold">{progressPct}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {cardStats.done > 0
              ? `${cardStats.done} concluído${cardStats.done !== 1 ? "s" : ""}`
              : "Nenhum concluído"}
          </p>
        </div>
      </div>

      {/* Two-column: Sprints + Atividade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Sprints do projeto */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-foreground">Sprints do projeto</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Acompanhe o andamento de cada ciclo</p>
            </div>
            <Link
              href={`/projetos/${slug}/sprints`}
              className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="divide-y">
            {sprints.slice(0, 5).map((sprint, idx) => {
              const sprintTotal = sprint._count.cards
              const sprintDone = sprint.cards.length
              const sprintPct = sprintTotal > 0 ? Math.round((sprintDone / sprintTotal) * 100) : 0
              const isActive = sprint.status === "ACTIVE"

              return (
                <Link
                  key={sprint.id}
                  href={`/projetos/${slug}/sprints/${sprint.id}/board`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/50 transition-colors group"
                >
                  {/* Number badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : sprint.status === "COMPLETED" || sprint.status === "CANCELLED"
                        ? "bg-muted text-muted-foreground"
                        : "bg-secondary text-secondary-foreground border"
                    }`}
                  >
                    {isActive ? idx + 1 : sprint.status === "PLANNED" ? idx + 1 : "·"}
                  </div>

                  {/* Sprint info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{sprint.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${SPRINT_STATUS_COLORS[sprint.status]}`}>
                        {SPRINT_STATUS_LABELS[sprint.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(sprint.plannedStartDate)} → {formatDate(sprint.plannedEndDate)}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {sprintDone}/{sprintTotal} · {sprintPct}%
                    </p>
                    <div className="mt-1 w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${sprintPct}%`, background: color.accent }}
                      />
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )
            })}

            {sprints.length === 0 && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                Nenhuma sprint criada.{" "}
                {canManage && (
                  <Link href={`/projetos/${slug}/sprints`} className="text-primary hover:underline">
                    Criar sprint
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Atividade recente */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-foreground">Atividade recente</h2>
              <p className="text-xs text-muted-foreground mt-0.5">O que sua equipe andou fazendo</p>
            </div>
            {canViewAudit && (
              <Link
                href={`/projetos/${slug}/atividade`}
                className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
              >
                Ver tudo <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          <div className="divide-y">
            {auditLogs.map((log) => {
              const actor = log.actor?.name ?? "Usuário"
              const action = ACTION_LABELS[log.action] ?? log.action
              const entity = ENTITY_LABELS[log.entityType] ?? log.entityType
              const changes = log.changes as Record<string, unknown> | null
              const entityName =
                (changes?.title as string) ??
                (changes?.name as string) ??
                (changes?.cardTitle as string) ??
                null

              return (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {getActivityIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{actor}</span>{" "}
                      <span className="text-muted-foreground">{action}</span>
                      {entityName && (
                        <> <span className="font-medium">"{entityName}"</span></>
                      )}
                      {!entityName && (
                        <> <span className="text-muted-foreground">{entity}</span></>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}

            {auditLogs.length === 0 && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                Nenhuma atividade registrada ainda.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

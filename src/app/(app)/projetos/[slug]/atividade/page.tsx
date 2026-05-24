import { redirect, notFound } from "next/navigation"
import { auth } from "@/server/auth/config"
import { findProjectBySlug } from "@/server/repositories/projects"
import { getMemberRole } from "@/server/permissions"
import { findAuditLogsByProjectPaginated } from "@/server/repositories/audit"
import { findMembersByProjectId } from "@/server/repositories/members"
import { AuditFilters } from "@/components/audit/AuditFilters"
import type { AuditAction } from "@prisma/client"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Removeu",
  MOVE: "Moveu",
  ASSIGN: "Atribuiu",
  COMMENT: "Comentou em",
  INVITE: "Convidou",
  JOIN: "Entrou no projeto",
  REMOVE_MEMBER: "Removeu membro de",
  START_SPRINT: "Iniciou sprint",
  END_SPRINT: "Encerrou sprint",
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  card: "card",
  sprint: "sprint",
  member: "membro",
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function AvatarCircle({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default async function AtividadePage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { slug } = await params
  const resolvedSearchParams = await searchParams

  const project = await findProjectBySlug(slug)
  if (!project) notFound()

  const role = await getMemberRole(session.user.id, project.id)
  const canView =
    session.user.isSystemAdmin || role === "ADMIN" || role === "SCRUM_MASTER"

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-xl font-semibold mb-2">Acesso negado</h1>
        <p className="text-muted-foreground">
          Você não tem permissão para visualizar o log de atividades deste projeto.
        </p>
      </div>
    )
  }

  const entityType =
    typeof resolvedSearchParams.entityType === "string"
      ? resolvedSearchParams.entityType
      : undefined
  const actorId =
    typeof resolvedSearchParams.actorId === "string"
      ? resolvedSearchParams.actorId
      : undefined

  const [logs, members] = await Promise.all([
    findAuditLogsByProjectPaginated(project.id, { entityType, actorId }),
    findMembersByProjectId(project.id),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Atividade</h1>
          <p className="text-sm text-muted-foreground mt-1">{project.name}</p>
        </div>
      </div>

      <AuditFilters
        members={members}
        currentEntityType={entityType}
        currentActorId={actorId}
        projectSlug={slug}
      />

      <div className="space-y-2 mt-6">
        {logs.map((log) => {
          const actorName = log.actor?.name ?? "Usuário desconhecido"
          const actionLabel = ACTION_LABELS[log.action] ?? log.action
          const entityLabel =
            ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType

          return (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
            >
              <AvatarCircle
                name={actorName}
                avatarUrl={log.actor?.avatarUrl}
              />
              <div className="flex-1 min-w-0">
                <p className="text-foreground">
                  <span className="font-medium">{actorName}</span>{" "}
                  <span className="text-muted-foreground">{actionLabel}</span>{" "}
                  <span className="text-foreground">
                    {entityLabel}{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                      {log.entityId}
                    </code>
                  </span>
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                {formatDateTime(log.createdAt)}
              </span>
            </div>
          )
        })}
      </div>

      {logs.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          Nenhuma atividade registrada.
        </p>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CalendarDays, LayoutDashboard, Activity } from "lucide-react"
import { startSprintAction, closeSprintAction } from "@/server/actions/sprints"
import { SprintActivitiesPanel } from "@/components/sprints/SprintActivitiesPanel"

interface Sprint {
  id: string
  name: string
  goal: string | null
  plannedStartDate: Date
  plannedEndDate: Date
  startedAt: Date | null
  endedAt: Date | null
  status: string
  cards: Array<{ status: string }>
}

interface Props {
  sprints: Sprint[]
  projectId: string
  projectSlug: string
  canManage: boolean
  plannedSprints: Sprint[]
  hasActiveSprint?: boolean
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR")
}

function daysDiff(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

function sprintDayInfo(sprint: Sprint): string | null {
  const now = new Date()
  const start = new Date(sprint.plannedStartDate)
  const end = new Date(sprint.plannedEndDate)

  if (sprint.status === "ACTIVE") {
    const totalDays = daysDiff(start, end) + 1
    const currentDay = Math.min(daysDiff(start, now) + 1, totalDays)
    return `Dia ${currentDay} de ${totalDays}`
  }
  if (sprint.status === "PLANNED") {
    const daysUntil = daysDiff(now, start)
    if (daysUntil <= 0) return "Inicia hoje"
    return `Inicia em ${daysUntil}d`
  }
  if (sprint.status === "COMPLETED" || sprint.status === "CANCELLED") {
    return "Encerrada"
  }
  return null
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  PLANNED: "bg-blue-500",
  COMPLETED: "bg-muted-foreground",
  CANCELLED: "bg-destructive",
}
const STATUS_TEXT: Record<string, string> = {
  ACTIVE: "text-emerald-700",
  PLANNED: "text-blue-700",
  COMPLETED: "text-muted-foreground",
  CANCELLED: "text-destructive",
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PLANNED: "Planejada",
  COMPLETED: "Encerrada",
  CANCELLED: "Cancelada",
}

function SprintCard({
  sprint,
  projectSlug,
  projectId,
  canManage,
  hasActiveSprint,
  plannedSprints,
}: {
  sprint: Sprint
  projectSlug: string
  projectId: string
  canManage: boolean
  hasActiveSprint: boolean
  plannedSprints: Sprint[]
}) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [closeDialog, setCloseDialog] = useState(false)
  const [destinationSprintId, setDestinationSprintId] = useState("none")
  const [activitiesOpen, setActivitiesOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cards = sprint.cards
  const done = cards.filter((c) => c.status === "DONE").length
  const validation = cards.filter((c) => c.status === "VALIDATION").length
  const doing = cards.filter((c) => c.status === "DOING").length
  const backlog = cards.filter((c) => c.status === "BACKLOG").length
  const total = cards.length

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  const dayInfo = sprintDayInfo(sprint)
  const isActive = sprint.status === "ACTIVE"
  const isPlanned = sprint.status === "PLANNED"

  async function handleStart() {
    setLoadingAction("start")
    const result = await startSprintAction(sprint.id)
    setLoadingAction(null)
    if (!result.success) { setError(result.error); return }
    router.refresh()
  }

  async function handleClose() {
    setLoadingAction("close")
    const formData = new FormData()
    if (destinationSprintId !== "none") formData.set("destinationSprintId", destinationSprintId)
    const result = await closeSprintAction(sprint.id, formData)
    setLoadingAction(null)
    setCloseDialog(false)
    if (!result.success) { setError(result.error); return }
    router.refresh()
  }

  const otherPlanned = plannedSprints.filter((s) => s.id !== sprint.id)

  return (
    <>
      <div className={`bg-card rounded-xl border p-5 ${isActive ? "border-foreground/20 shadow-sm" : ""}`}>
        {error && <p className="text-xs text-destructive mb-2">{error}</p>}

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold">{sprint.name}</h3>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted ${STATUS_TEXT[sprint.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[sprint.status]}`} />
                {STATUS_LABEL[sprint.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDate(sprint.plannedStartDate)} — {formatDate(sprint.plannedEndDate)}</span>
              {dayInfo && (
                <span className={isActive ? "text-emerald-600 font-medium" : "text-blue-600"}>
                  · {dayInfo}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm">
              <Link href={`/projetos/${projectSlug}/sprints/${sprint.id}/board`}>
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                Abrir board
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setActivitiesOpen(true)}
            >
              <Activity className="w-3.5 h-3.5" />
            </Button>
            {canManage && isPlanned && !hasActiveSprint && (
              <Button size="sm" variant="outline" onClick={handleStart} disabled={loadingAction === "start"}>
                {loadingAction === "start" ? "Iniciando..." : "Iniciar"}
              </Button>
            )}
            {canManage && isActive && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setCloseDialog(true); setDestinationSprintId("none") }}
                disabled={loadingAction === "close"}
              >
                Encerrar sprint
              </Button>
            )}
          </div>
        </div>

        {/* Objetivo */}
        {sprint.goal && (
          <div className="mt-4 rounded-lg border bg-muted/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Objetivo</p>
            <p className="text-sm text-foreground">{sprint.goal}</p>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-4">
          {total > 0 ? (
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted gap-px">
              {done > 0 && <div style={{ width: `${pct(done)}%`, background: "#22c55e" }} />}
              {validation > 0 && <div style={{ width: `${pct(validation)}%`, background: "#3b82f6" }} />}
              {doing > 0 && <div style={{ width: `${pct(doing)}%`, background: "#f97316" }} />}
              {backlog > 0 && <div style={{ width: `${pct(backlog)}%` }} className="bg-muted-foreground/30" />}
            </div>
          ) : (
            <div className="h-2.5 rounded-full bg-muted" />
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Concluído ({done})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Validação ({validation})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />Em andamento ({doing})</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/40" />Backlog ({backlog})</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {done}
              <span className="text-base text-muted-foreground font-normal">/{total}</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Concluídos</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{doing + validation}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Em Curso</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{backlog}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Backlog</p>
          </div>
        </div>
      </div>

      {/* Close sprint dialog */}
      <Dialog open={closeDialog} onOpenChange={(o) => !o && setCloseDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar sprint</DialogTitle>
            <DialogDescription>
              Cards não finalizados serão movidos. Escolha o destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Mover cards incompletos para:</Label>
            <Select value={destinationSprintId} onValueChange={setDestinationSprintId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Backlog (sem sprint)</SelectItem>
                {otherPlanned.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancelar</Button>
            <Button onClick={handleClose} disabled={loadingAction === "close"}>
              {loadingAction === "close" ? "Encerrando..." : "Encerrar sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activities dialog */}
      <Dialog open={activitiesOpen} onOpenChange={(o) => !o && setActivitiesOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atividades principais</DialogTitle></DialogHeader>
          {activitiesOpen && (
            <SprintActivitiesPanel sprintId={sprint.id} projectId={projectId} canManage={canManage} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function SprintList({
  sprints,
  projectId,
  projectSlug,
  canManage,
  plannedSprints,
  hasActiveSprint = false,
}: Props) {
  return (
    <div className="space-y-3">
      {sprints.map((sprint) => (
        <SprintCard
          key={sprint.id}
          sprint={sprint}
          projectSlug={projectSlug}
          projectId={projectId}
          canManage={canManage}
          hasActiveSprint={hasActiveSprint}
          plannedSprints={plannedSprints}
        />
      ))}
    </div>
  )
}

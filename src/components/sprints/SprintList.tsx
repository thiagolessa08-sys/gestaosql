"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Activity } from "lucide-react"
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
}

interface Props {
  sprints: Sprint[]
  projectId: string
  projectSlug: string
  canManage: boolean
  plannedSprints: Sprint[]
  statusLabels: Record<string, string>
  statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive">
  hasActiveSprint?: boolean
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR")
}

export function SprintList({
  sprints,
  projectId,
  projectSlug,
  canManage,
  plannedSprints,
  statusLabels,
  statusVariants,
  hasActiveSprint = false,
}: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [closeDialogSprint, setCloseDialogSprint] = useState<Sprint | null>(null)
  const [destinationSprintId, setDestinationSprintId] = useState<string>("none")
  const [error, setError] = useState<string | null>(null)
  const [activitiesDialogSprintId, setActivitiesDialogSprintId] = useState<string | null>(null)

  async function handleStart(sprintId: string) {
    setLoadingId(sprintId)
    const result = await startSprintAction(sprintId)
    setLoadingId(null)
    if (!result.success) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function handleClose() {
    if (!closeDialogSprint) return
    setLoadingId(closeDialogSprint.id)

    const formData = new FormData()
    if (destinationSprintId !== "none") {
      formData.set("destinationSprintId", destinationSprintId)
    }

    const result = await closeSprintAction(closeDialogSprint.id, formData)
    setLoadingId(null)
    setCloseDialogSprint(null)

    if (!result.success) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  const otherPlannedSprints = plannedSprints.filter((s) => s.id !== closeDialogSprint?.id)

  return (
    <>
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      <div className="space-y-3">
        {sprints.map((sprint) => (
          <Card key={sprint.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{sprint.name}</CardTitle>
                <Badge variant={statusVariants[sprint.status] ?? "outline"}>
                  {statusLabels[sprint.status] ?? sprint.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {sprint.goal && (
                <p className="text-sm text-muted-foreground mb-2">{sprint.goal}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDate(sprint.plannedStartDate)} → {formatDate(sprint.plannedEndDate)}
              </p>

              <div className="flex gap-2 mt-3 flex-wrap">
                <Button asChild size="sm">
                  <Link href={`/projetos/${projectSlug}/sprints/${sprint.id}/board`}>
                    Abrir board
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActivitiesDialogSprintId(sprint.id)}
                >
                  <Activity className="h-3.5 w-3.5 mr-1" />
                  Atividades
                </Button>
                {canManage && sprint.status === "PLANNED" && !hasActiveSprint && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStart(sprint.id)}
                    disabled={loadingId === sprint.id}
                  >
                    {loadingId === sprint.id ? "Iniciando..." : "Iniciar sprint"}
                  </Button>
                )}
                {canManage && sprint.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCloseDialogSprint(sprint)
                      setDestinationSprintId("none")
                    }}
                    disabled={loadingId === sprint.id}
                  >
                    Encerrar sprint
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Close sprint dialog */}
      <Dialog open={!!closeDialogSprint} onOpenChange={(open) => !open && setCloseDialogSprint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar sprint</DialogTitle>
            <DialogDescription>
              Cards não finalizados (não-DONE) serão movidos. Escolha o destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Mover cards incompletos para:</Label>
            <Select value={destinationSprintId} onValueChange={setDestinationSprintId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Backlog (sem sprint)</SelectItem>
                {otherPlannedSprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogSprint(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleClose}
              disabled={loadingId === closeDialogSprint?.id}
            >
              {loadingId === closeDialogSprint?.id ? "Encerrando..." : "Encerrar sprint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activities dialog */}
      <Dialog
        open={!!activitiesDialogSprintId}
        onOpenChange={(open) => !open && setActivitiesDialogSprintId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atividades principais</DialogTitle>
          </DialogHeader>
          {activitiesDialogSprintId && (
            <SprintActivitiesPanel
              sprintId={activitiesDialogSprintId}
              projectId={projectId}
              canManage={canManage}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

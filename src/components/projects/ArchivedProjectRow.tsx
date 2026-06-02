"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArchiveRestore, Trash2 } from "lucide-react"
import { unarchiveProjectAction, deleteProjectAction } from "@/server/actions/projects"
import type { ProjectListItem } from "@/components/projects/ProjectCard"

interface Props {
  project: ProjectListItem
}

export function ArchivedProjectRow({ project }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const arquivadoEm = project.archivedAt
    ? new Date(project.archivedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const r = await unarchiveProjectAction(project.id)
      if (!r.success) { setError(r.error); return }
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setError(null)
    startTransition(async () => {
      const r = await deleteProjectAction(project.id)
      if (!r.success) { setError(r.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground">
          {project._count.cards} cards · {project._count.sprints} sprints
          {arquivadoEm && ` · arquivado em ${arquivadoEm}`}
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleRestore} disabled={isPending}>
          <ArchiveRestore className="w-4 h-4 mr-1" />
          Restaurar
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="w-4 h-4 mr-1" />
          {confirmDelete ? "Confirmar exclusão" : "Apagar"}
        </Button>
      </div>
    </div>
  )
}

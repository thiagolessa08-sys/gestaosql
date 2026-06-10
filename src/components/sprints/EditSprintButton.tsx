"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil } from "lucide-react"
import { updateSprintAction } from "@/server/actions/sprints"

function toInputDate(date: Date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

interface Props {
  sprintId: string
  name: string
  goal: string | null
  plannedStartDate: Date
  plannedEndDate: Date
}

export function EditSprintButton({ sprintId, name, goal, plannedStartDate, plannedEndDate }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editName, setEditName] = useState(name)
  const [editGoal, setEditGoal] = useState(goal ?? "")
  const [editStart, setEditStart] = useState(toInputDate(plannedStartDate))
  const [editEnd, setEditEnd] = useState(toInputDate(plannedEndDate))

  function openDialog() {
    setEditName(name)
    setEditGoal(goal ?? "")
    setEditStart(toInputDate(plannedStartDate))
    setEditEnd(toInputDate(plannedEndDate))
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    const formData = new FormData()
    formData.set("name", editName)
    formData.set("goal", editGoal)
    formData.set("plannedStartDate", editStart)
    formData.set("plannedEndDate", editEnd)
    const result = await updateSprintAction(sprintId, formData)
    setLoading(false)
    if (!result.success) { setError(result.error); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        Editar sprint
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar sprint</DialogTitle>
            <DialogDescription>Altere o nome, datas e objetivo da sprint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="space-y-1.5">
              <Label htmlFor={`es-name-${sprintId}`}>Nome</Label>
              <Input id={`es-name-${sprintId}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`es-start-${sprintId}`}>Data início</Label>
                <Input id={`es-start-${sprintId}`} type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`es-end-${sprintId}`}>Data fim</Label>
                <Input id={`es-end-${sprintId}`} type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`es-goal-${sprintId}`}>Objetivo</Label>
              <Textarea id={`es-goal-${sprintId}`} value={editGoal} onChange={(e) => setEditGoal(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

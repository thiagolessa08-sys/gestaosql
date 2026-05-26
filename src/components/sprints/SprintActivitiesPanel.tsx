"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import {
  getSprintMainActivitiesAction,
  createMainActivityAction,
  deleteMainActivityAction,
} from "@/server/actions/mainActivities"

const PRESET_COLORS = [
  { label: "Vermelho", value: "#ef4444" },
  { label: "Laranja", value: "#f97316" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Verde", value: "#22c55e" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Roxo", value: "#a855f7" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Cinza", value: "#6b7280" },
]

interface Activity {
  id: string
  name: string
  color: string
}

interface Props {
  sprintId: string
  projectId: string
  canManage: boolean
}

export function SprintActivitiesPanel({ sprintId, projectId, canManage }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0].value)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const result = await getSprintMainActivitiesAction(sprintId)
    setLoading(false)
    if (result.success && result.data) setActivities(result.data)
  }

  useEffect(() => {
    load()
  }, [sprintId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)
    const fd = new FormData()
    fd.set("name", name)
    fd.set("color", color)
    const result = await createMainActivityAction(sprintId, fd)
    setCreating(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setName("")
    setColor(PRESET_COLORS[0].value)
    await load()
  }

  async function handleDelete(activityId: string) {
    if (!confirm("Remover esta atividade? Cards associados perderão o vínculo.")) return
    const result = await deleteMainActivityAction(activityId, projectId)
    if (!result.success) {
      alert(result.error)
      return
    }
    await load()
  }

  return (
    <div className="space-y-4">
      {/* Activity list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma atividade cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 py-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: a.color }}
                />
                <span className="text-sm">{a.name}</span>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form (only for canManage) */}
      {canManage && (
        <form onSubmit={handleCreate} className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Nova atividade</p>
          <div className="space-y-1">
            <Label htmlFor="act-name">Nome</Label>
            <Input
              id="act-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Desenvolvimento, QA, Design..."
              required
              maxLength={80}
            />
          </div>
          <div className="space-y-1">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    color === c.value ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={creating || !name.trim()}>
            {creating ? "Criando..." : "Adicionar atividade"}
          </Button>
        </form>
      )}
    </div>
  )
}

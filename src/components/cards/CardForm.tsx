"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCardAction } from "@/server/actions/cards"

interface Member {
  id: string
  user: { id: string; name: string }
}

interface Props {
  projectId: string
  sprintId?: string
  members: Member[]
}

export function CardForm({ projectId, sprintId, members }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priority, setPriority] = useState("MEDIUM")
  const [assigneeId, setAssigneeId] = useState("none")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.set("priority", priority)
    if (assigneeId !== "none") formData.set("assigneeId", assigneeId)
    if (sprintId) formData.set("sprintId", sprintId)

    const result = await createCardAction(projectId, formData)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    ;(e.target as HTMLFormElement).reset()
    setPriority("MEDIUM")
    setAssigneeId("none")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Novo card</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required maxLength={255} placeholder="Descreva a atividade" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea id="description" name="description" rows={2} maxLength={5000} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baixa</SelectItem>
                  <SelectItem value="MEDIUM">Média</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                  <SelectItem value="CRITICAL">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="storyPoints">Story points</Label>
              <Input id="storyPoints" name="storyPoints" type="number" min={0} max={100} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dueDate">Prazo</Label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} size="sm" className="w-full">
            {loading ? "Criando..." : "Criar card"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

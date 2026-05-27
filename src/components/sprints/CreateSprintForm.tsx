"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createSprintAction } from "@/server/actions/sprints"

interface Props {
  projectId: string
}

export function CreateSprintForm({ projectId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    const result = await createSprintAction(projectId, new FormData(e.currentTarget))
    setLoading(false)
    if (!result.success) { setError(result.error); return }
    setSuccess(true)
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
  }

  return (
    <div className="bg-card rounded-xl border p-5 sticky top-6">
      <h2 className="font-semibold text-foreground">Nova sprint</h2>
      <p className="text-xs text-muted-foreground mt-0.5 mb-5">Defina objetivo e duração</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">Nome</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="Ex: Sprint 2" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal" className="text-sm font-medium">
            Objetivo <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea
            id="goal"
            name="goal"
            rows={3}
            maxLength={500}
            placeholder="O que será entregue nesta sprint?"
            className="resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="plannedStartDate" className="text-sm font-medium">Início</Label>
            <Input id="plannedStartDate" name="plannedStartDate" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plannedEndDate" className="text-sm font-medium">Término</Label>
            <Input id="plannedEndDate" name="plannedEndDate" type="date" required />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">Sprint criada com sucesso!</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Criando..." : "Criar sprint"}
        </Button>
      </form>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

    if (!result.success) {
      setError(result.error)
      return
    }

    setSuccess(true)
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nova sprint</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="Ex: Sprint 1" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="goal">Objetivo (opcional)</Label>
            <Textarea id="goal" name="goal" rows={2} maxLength={500} placeholder="O que será entregue nesta sprint?" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plannedStartDate">Início</Label>
            <Input id="plannedStartDate" name="plannedStartDate" type="date" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="plannedEndDate">Término</Label>
            <Input id="plannedEndDate" name="plannedEndDate" type="date" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Sprint criada!</p>}
          <Button type="submit" disabled={loading} size="sm" className="w-full">
            {loading ? "Criando..." : "Criar sprint"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createProjectAction } from "@/server/actions/projects"

export default function NovoProjetoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createProjectAction(new FormData(e.currentTarget))
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    router.push(`/projetos/${result.data?.slug}`)
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Novo projeto</h1>
      <Card>
        <CardHeader>
          <CardTitle>Criar projeto</CardTitle>
          <CardDescription>Preencha os dados do novo projeto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome do projeto</Label>
              <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="Ex: Portal do Cliente" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea id="description" name="description" maxLength={500} rows={3} placeholder="Descreva o projeto brevemente..." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar projeto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

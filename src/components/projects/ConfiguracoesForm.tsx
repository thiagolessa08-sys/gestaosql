"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { updateProjectAction, archiveProjectAction } from "@/server/actions/projects"

interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  archivedAt: Date | null
}

interface Props {
  project: Project
}

export function ConfiguracoesForm({ project }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    const result = await updateProjectAction(project.id, new FormData(e.currentTarget))
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setSuccess(true)
    router.refresh()
  }

  async function handleArchive() {
    if (!confirm("Tem certeza que deseja arquivar este projeto?")) return
    setArchiving(true)
    const result = await archiveProjectAction(project.id)
    setArchiving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    router.push("/projetos")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações gerais</CardTitle>
          <CardDescription>Atualize o nome e descrição do projeto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project.name}
                minLength={2}
                maxLength={100}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={project.description ?? ""}
                maxLength={500}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">Projeto atualizado com sucesso.</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de perigo</CardTitle>
          <CardDescription>
            Arquivar o projeto oculta-o da listagem mas preserva todos os dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
            {archiving ? "Arquivando..." : "Arquivar projeto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

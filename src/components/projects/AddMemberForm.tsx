"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addMemberDirectlyAction } from "@/server/actions/members"
import { UserPlus } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
}

interface Props {
  projectId: string
  availableUsers: User[]
}

export function AddMemberForm({ projectId, availableUsers }: Props) {
  const router = useRouter()
  const [userId, setUserId] = useState<string>("")
  const [role, setRole] = useState<string>("MEMBER")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.set("userId", userId)
    formData.set("role", role)

    const result = await addMemberDirectlyAction(projectId, formData)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    const added = availableUsers.find((u) => u.id === userId)
    setSuccess(`${added?.name ?? "Usuário"} adicionado ao projeto.`)
    setUserId("")
    setRole("MEMBER")
    router.refresh()
  }

  if (availableUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Adicionar usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todos os usuários do sistema já são membros deste projeto.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Adicionar usuário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Usuário</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="flex flex-col">
                      <span>{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="SCRUM_MASTER">Scrum Master</SelectItem>
                <SelectItem value="MEMBER">Membro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" size="sm" disabled={loading || !userId}>
            {loading ? "Adicionando..." : "Adicionar ao projeto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

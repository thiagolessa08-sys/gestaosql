"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminCreateUserAction, adminDeleteUserAction } from "@/server/actions/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Trash2, UserPlus, ShieldCheck } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  isSystemAdmin: boolean
  mustChangePassword: boolean
  createdAt: Date
}

interface Props {
  users: User[]
  currentUserId: string
}

export function UserManagement({ users, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set("isSystemAdmin", isAdmin ? "true" : "false")

    const result = await adminCreateUserAction(formData)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setSuccess("Usuário criado com sucesso! Ele precisará trocar a senha no primeiro acesso.")
    setIsAdmin(false)
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Remover o usuário "${userName}"? Esta ação não pode ser desfeita.`)) return

    const result = await adminDeleteUserAction(userId)
    if (!result.success) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Create user form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Criar novo usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" placeholder="João Silva" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="joao@exemplo.com" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha inicial</Label>
              <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" required minLength={8} />
              <p className="text-xs text-muted-foreground">O usuário será obrigado a trocar a senha no primeiro acesso.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isSystemAdmin"
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isSystemAdmin" className="font-normal cursor-pointer">
                Administrador do sistema
              </Label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}

            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* User list */}
      <div>
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">
          Usuários cadastrados ({users.length})
        </h2>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    {user.isSystemAdmin && (
                      <Badge variant="default" className="text-xs gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                    {user.mustChangePassword && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        Troca senha pendente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {user.id !== currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(user.id, user.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

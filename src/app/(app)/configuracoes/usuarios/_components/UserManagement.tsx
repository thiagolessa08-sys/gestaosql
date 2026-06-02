"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  adminCreateUserAction,
  adminDeleteUserAction,
  adminUpdateUserTipoAction,
  adminUpdateUserNameAction,
} from "@/server/actions/users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Trash2, UserPlus, Pencil, Check, X } from "lucide-react"
import type { PerfilAcesso } from "@prisma/client"

type TipoUsuario = "ADMIN" | "COMERCIAL" | "PROJETOS"

interface User {
  id: string
  name: string
  email: string
  isSystemAdmin: boolean
  perfil: PerfilAcesso
  mustChangePassword: boolean
  createdAt: Date
}

interface Props {
  users: User[]
  currentUserId: string
}

const TIPO_LABEL: Record<TipoUsuario, string> = {
  ADMIN: "Admin",
  COMERCIAL: "Comercial",
  PROJETOS: "Projetos",
}

function tipoDoUsuario(u: { isSystemAdmin: boolean; perfil: PerfilAcesso }): TipoUsuario {
  if (u.isSystemAdmin) return "ADMIN"
  return u.perfil === "COMERCIAL" ? "COMERCIAL" : "PROJETOS"
}

export function UserManagement({ users, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoUsuario>("PROJETOS")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set("tipo", tipo)

    const result = await adminCreateUserAction(formData)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    setSuccess("Usuário criado com sucesso! Ele precisará trocar a senha no primeiro acesso.")
    setTipo("PROJETOS")
    ;(e.target as HTMLFormElement).reset()
    router.refresh()
  }

  async function handleChangeTipo(userId: string, novoTipo: TipoUsuario) {
    const result = await adminUpdateUserTipoAction(userId, novoTipo)
    if (!result.success) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  function startEdit(userId: string, currentName: string) {
    setEditingId(userId)
    setEditName(currentName)
  }

  async function handleSaveName(userId: string) {
    const result = await adminUpdateUserNameAction(userId, editName)
    if (!result.success) {
      alert(result.error)
      return
    }
    setEditingId(null)
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="password">Senha inicial</Label>
                <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" required minLength={8} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tipo">Tipo de usuário</Label>
                <select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoUsuario)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="PROJETOS">Projetos</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="ADMIN">Admin (vê tudo)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O usuário será obrigado a trocar a senha no primeiro acesso.</p>

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
          {users.map((user) => {
            const ehProprio = user.id === currentUserId
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveName(user.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          autoFocus
                          className="h-7 text-sm"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleSaveName(user.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <button
                          type="button"
                          onClick={() => startEdit(user.id, user.name)}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Editar nome"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {user.mustChangePassword && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                            Troca senha pendente
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ehProprio ? (
                    <Badge variant="secondary" className="text-xs">{TIPO_LABEL[tipoDoUsuario(user)]}</Badge>
                  ) : (
                    <select
                      value={tipoDoUsuario(user)}
                      onChange={(e) => handleChangeTipo(user.id, e.target.value as TipoUsuario)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="PROJETOS">Projetos</option>
                      <option value="COMERCIAL">Comercial</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  )}
                  {!ehProprio && (
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

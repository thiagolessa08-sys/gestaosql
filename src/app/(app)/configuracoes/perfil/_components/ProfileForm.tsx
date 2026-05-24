"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { updateProfileAction, changePasswordAction } from "@/server/actions/users"

interface ProfileFormProps {
  initialName: string
  initialAvatarUrl: string | null
}

export function ProfileForm({ initialName, initialAvatarUrl }: ProfileFormProps) {
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ success: boolean; text: string } | null>(null)

  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ success: boolean; text: string } | null>(null)

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMessage(null)
    const result = await updateProfileAction(new FormData(e.currentTarget))
    setProfileLoading(false)
    if (result.success) {
      setProfileMessage({ success: true, text: "Perfil atualizado com sucesso." })
    } else {
      setProfileMessage({ success: false, text: result.error })
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage(null)
    const result = await changePasswordAction(new FormData(e.currentTarget))
    setPasswordLoading(false)
    if (result.success) {
      setPasswordMessage({ success: true, text: "Senha alterada com sucesso." })
      ;(e.target as HTMLFormElement).reset()
    } else {
      setPasswordMessage({ success: false, text: result.error })
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile section */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do perfil</CardTitle>
          <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={initialName}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="avatarUrl">URL do avatar (opcional)</Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                defaultValue={initialAvatarUrl ?? ""}
                placeholder="https://exemplo.com/foto.png"
              />
            </div>
            {profileMessage && (
              <p className={`text-sm ${profileMessage.success ? "text-green-600" : "text-destructive"}`}>
                {profileMessage.text}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={profileLoading}>
                {profileLoading ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Change password section */}
      <Card>
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>Insira sua senha atual e escolha uma nova senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.success ? "text-green-600" : "text-destructive"}`}>
                {passwordMessage.text}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Trocando..." : "Trocar senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TrocarSenhaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get("newPassword")
    if (typeof newPassword !== "string" || !newPassword) return
    const confirm = formData.get("confirm")
    if (typeof confirm !== "string" || !confirm) return
    if (newPassword !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    setLoading(true)
    // Server action will be wired in Task 2.6
    await new Promise((r) => setTimeout(r, 500))
    setLoading(false)
    // After successful change, redirect to /projetos
    router.push("/projetos")
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Trocar senha</CardTitle>
          <CardDescription>
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

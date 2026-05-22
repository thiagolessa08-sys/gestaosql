"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function RedefinirSenhaForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link inválido</CardTitle>
          <CardDescription>O link de redefinição é inválido ou expirou.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/esqueci-senha" className="text-sm text-muted-foreground hover:underline">
            Solicitar novo link
          </a>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirm = formData.get("confirm") as string
    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    setLoading(true)
    // Server action will be wired in Task 2.6
    await new Promise((r) => setTimeout(r, 500))
    setLoading(false)
    setDone(true)
  }

  if (done) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Senha redefinida</CardTitle>
          <CardDescription>Sua senha foi alterada com sucesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/login" className="text-sm text-muted-foreground hover:underline">
            Ir para o login
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <RedefinirSenhaForm />
    </Suspense>
  )
}

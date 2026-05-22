"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ConviteForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Convite inválido</CardTitle>
          <CardDescription>O link de convite é inválido ou expirou.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password = formData.get("password")
    if (typeof password !== "string" || !password) return
    const confirm = formData.get("confirm")
    if (typeof confirm !== "string" || !confirm) return
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
          <CardTitle>Conta criada!</CardTitle>
          <CardDescription>Sua conta foi criada com sucesso. Faça login para acessar o sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Criar sua conta</CardTitle>
        <CardDescription>Você foi convidado. Preencha seus dados para entrar no sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" name="name" type="text" required autoComplete="name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={8} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ConvitePage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConviteForm />
    </Suspense>
  )
}

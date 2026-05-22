"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function EsqueciSenhaPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // Server action will be wired in Task 2.6
    await new Promise((r) => setTimeout(r, 500))
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Email enviado</CardTitle>
          <CardDescription>
            Se o email estiver cadastrado, você receberá as instruções em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/login" className="text-sm text-muted-foreground hover:underline">
            Voltar para o login
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Digite seu email para receber o link de redefinição.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </Button>
          <div className="text-center text-sm">
            <a href="/login" className="text-muted-foreground hover:underline">
              Voltar para o login
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

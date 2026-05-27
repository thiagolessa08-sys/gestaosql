"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword } from "@/server/actions/auth"

export default function TrocarSenhaPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get("newPassword")
    const confirm = formData.get("confirm")

    if (typeof newPassword !== "string" || !newPassword) return
    if (typeof confirm !== "string" || !confirm) return
    if (newPassword !== confirm) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    const result = await changePassword(formData)

    if (!result.success) {
      setLoading(false)
      setError(result.error)
      return
    }

    // Reemite o JWT com mustChangePassword: false fazendo signIn programático
    // com a nova senha. O useSession().update() do NextAuth v5 beta não está
    // propagando o flag para o cookie de forma confiável, então o middleware
    // continuaria redirecionando para /trocar-senha em loop.
    const email = session?.user?.email
    if (!email) {
      setLoading(false)
      setError("Sessão inválida. Faça login novamente.")
      return
    }

    const signInResult = await signIn("credentials", {
      email,
      password: newPassword,
      redirect: false,
    })

    setLoading(false)

    if (signInResult?.error) {
      setError("Senha atualizada, mas a sessão não foi renovada. Faça login novamente.")
      return
    }

    router.push("/projetos")
    router.refresh()
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

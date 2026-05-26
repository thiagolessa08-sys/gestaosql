import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/server/auth/config"

export default async function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>
      <div className="flex gap-4 mb-6 border-b pb-2">
        <Link
          href="/configuracoes/perfil"
          className="text-sm font-medium hover:text-foreground text-muted-foreground transition-colors"
        >
          Perfil
        </Link>
        <Link
          href="/configuracoes/notificacoes"
          className="text-sm font-medium hover:text-foreground text-muted-foreground transition-colors"
        >
          Notificações
        </Link>
        {session.user.isSystemAdmin && (
          <Link
            href="/configuracoes/usuarios"
            className="text-sm font-medium hover:text-foreground text-muted-foreground transition-colors"
          >
            Usuários
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

import type { ReactNode } from "react"
import Link from "next/link"

export default function ConfiguracoesLayout({ children }: { children: ReactNode }) {
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
      </div>
      {children}
    </div>
  )
}

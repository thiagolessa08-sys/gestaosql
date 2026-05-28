"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Settings, BarChart3 } from "lucide-react"

const NAV_LINKS = [
  { href: "/projetos", activePath: "/projetos", label: "Projetos", icon: LayoutGrid },
  { href: "/painel", activePath: "/painel", label: "Painel", icon: BarChart3 },
  { href: "/configuracoes/perfil", activePath: "/configuracoes", label: "Configurações", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_LINKS.map(({ href, activePath, label, icon: Icon }) => {
        const active = pathname.startsWith(activePath)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/60 hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

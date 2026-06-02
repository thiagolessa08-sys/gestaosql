"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Settings, BarChart3, Briefcase } from "lucide-react"
import type { PerfilAcesso } from "@prisma/client"

type Area = "projetos" | "comercial" | "painel" | "config"

const NAV_LINKS: {
  href: string
  activePath: string
  label: string
  icon: typeof LayoutGrid
  area: Area
}[] = [
  { href: "/projetos", activePath: "/projetos", label: "Projetos", icon: LayoutGrid, area: "projetos" },
  { href: "/comercial", activePath: "/comercial", label: "Comercial", icon: Briefcase, area: "comercial" },
  { href: "/painel", activePath: "/painel", label: "Painel", icon: BarChart3, area: "painel" },
  { href: "/configuracoes/perfil", activePath: "/configuracoes", label: "Configurações", icon: Settings, area: "config" },
]

interface Props {
  isSystemAdmin: boolean
  perfil: PerfilAcesso
}

export function SidebarNav({ isSystemAdmin, perfil }: Props) {
  const pathname = usePathname()

  function podeVer(area: Area): boolean {
    if (area === "config") return true
    if (isSystemAdmin) return true
    if (area === "painel") return false // só admin
    if (area === "comercial") return perfil === "COMERCIAL"
    if (area === "projetos") return perfil === "PROJETOS"
    return false
  }

  const links = NAV_LINKS.filter((l) => podeVer(l.area))

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {links.map(({ href, activePath, label, icon: Icon }) => {
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

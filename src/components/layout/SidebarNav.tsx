"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Settings, BarChart3, Briefcase } from "lucide-react"
import type { PerfilAcesso } from "@prisma/client"
import {
  podeVerProjetos,
  podeVerComercial,
  podeVerPainelProjetos,
  podeVerPainelComercial,
} from "@/lib/acesso"

const NAV_LINKS = [
  { href: "/projetos",        activePath: "/projetos",        label: "Projetos",         icon: LayoutGrid, key: "projetos"        },
  { href: "/comercial",       activePath: "/comercial",       label: "Comercial",        icon: Briefcase,  key: "comercial"       },
  { href: "/painel",          activePath: "/painel",          label: "Painel Projetos",  icon: BarChart3,  key: "painelProjetos"  },
  { href: "/painel-comercial",activePath: "/painel-comercial",label: "Painel Comercial", icon: BarChart3,  key: "painelComercial" },
  { href: "/configuracoes/perfil", activePath: "/configuracoes", label: "Configurações", icon: Settings,   key: "config"          },
]

interface Props {
  isSystemAdmin: boolean
  perfil: PerfilAcesso
}

export function SidebarNav({ isSystemAdmin, perfil }: Props) {
  const pathname = usePathname()
  const u = { isSystemAdmin, perfil }

  const links = NAV_LINKS.filter(({ key }) => {
    if (key === "projetos")        return podeVerProjetos(u)
    if (key === "comercial")       return podeVerComercial(u)
    if (key === "painelProjetos")  return podeVerPainelProjetos(u)
    if (key === "painelComercial") return podeVerPainelComercial(u)
    return true // config: todos
  })

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {links.map(({ href, activePath, label, icon: Icon }) => {
        const active = pathname === activePath || pathname.startsWith(activePath + "/")
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                : "text-white/75 hover:bg-white/15 hover:text-white"
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

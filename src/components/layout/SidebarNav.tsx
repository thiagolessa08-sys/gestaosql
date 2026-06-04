"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Settings, BarChart3, Briefcase, MessageSquare, BarChart2 } from "lucide-react"
import type { PerfilAcesso } from "@prisma/client"
import {
  podeVerProjetos,
  podeVerComercial,
  podeVerPainelProjetos,
  podeVerPainelComercial,
} from "@/lib/acesso"

type NavKey = "projetos" | "comercial" | "painelProjetos" | "painelGerencial" | "painelComercial" | "chat" | "config"

const NAV_SECTIONS = [
  {
    label: "GERAL",
    links: [
      { href: "/projetos",        activePath: "/projetos",        label: "Projetos",            icon: LayoutGrid,    key: "projetos"        as NavKey },
      { href: "/comercial",       activePath: "/comercial",       label: "Comercial",           icon: Briefcase,     key: "comercial"       as NavKey },
    ],
  },
  {
    label: "PAINÉIS",
    links: [
      { href: "/painel",          activePath: "/painel",          label: "Painel Projetos TV",  icon: BarChart3,     key: "painelProjetos"  as NavKey },
      { href: "/painel-projetos", activePath: "/painel-projetos", label: "Painel Gerencial",    icon: BarChart2,     key: "painelGerencial" as NavKey },
      { href: "/painel-comercial",activePath: "/painel-comercial",label: "Painel Comercial",    icon: BarChart3,     key: "painelComercial" as NavKey },
    ],
  },
  {
    label: "SISTEMA",
    links: [
      { href: "/chat",                 activePath: "/chat",            label: "Chat IA",         icon: MessageSquare, key: "chat"   as NavKey },
      { href: "/configuracoes/perfil", activePath: "/configuracoes",   label: "Configurações",   icon: Settings,      key: "config" as NavKey },
    ],
  },
]

interface Props {
  isSystemAdmin: boolean
  perfil: PerfilAcesso
}

export function SidebarNav({ isSystemAdmin, perfil }: Props) {
  const pathname = usePathname()
  const u = { isSystemAdmin, perfil }

  function podeVer(key: NavKey): boolean {
    if (key === "projetos")        return podeVerProjetos(u)
    if (key === "comercial")       return podeVerComercial(u)
    if (key === "painelProjetos")  return podeVerPainelProjetos(u)
    if (key === "painelGerencial") return podeVerPainelProjetos(u)
    if (key === "painelComercial") return podeVerPainelComercial(u)
    if (key === "chat")            return isSystemAdmin || perfil === "ADMIN_PROJETO"
    return true
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-5">
      {NAV_SECTIONS.map(section => {
        const visibleLinks = section.links.filter(l => podeVer(l.key))
        if (!visibleLinks.length) return null
        return (
          <div key={section.label}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {visibleLinks.map(({ href, activePath, label, icon: Icon }) => {
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
            </div>
          </div>
        )
      })}
    </nav>
  )
}

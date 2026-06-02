"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { getProjectColor } from "@/lib/project-colors"

interface Props {
  projects: Array<{ id: string; name: string; slug: string }>
}

export function SidebarRecentProjects({ projects }: Props) {
  const pathname = usePathname()

  return (
    <div className="px-3 pb-2">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
        Projetos recentes
      </p>
      <div className="space-y-0.5">
        {projects.map((project) => {
          const color = getProjectColor(project.slug)
          const active = pathname.startsWith(`/projetos/${project.slug}`)
          return (
            <Link
              key={project.id}
              href={`/projetos/${project.slug}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-white/20 text-white font-medium"
                  : "text-white/75 hover:bg-white/15 hover:text-white"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: color.accent }}
              />
              <span className="truncate">{project.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

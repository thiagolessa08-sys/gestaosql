"use client"

import { useState } from "react"
import { ProjectCard, type ProjectListItem } from "@/components/projects/ProjectCard"
import { ArchivedProjectRow } from "@/components/projects/ArchivedProjectRow"

interface Props {
  ativos: ProjectListItem[]
  arquivados: ProjectListItem[]
  isSystemAdmin: boolean
}

export function ProjectsTabs({ ativos, arquivados, isSystemAdmin }: Props) {
  const [aba, setAba] = useState<"ativos" | "arquivados">("ativos")

  return (
    <div>
      {isSystemAdmin && (
        <div className="flex gap-1 mb-4">
          <button
            onClick={() => setAba("ativos")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              aba === "ativos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Ativos
          </button>
          <button
            onClick={() => setAba("arquivados")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              aba === "arquivados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            Arquivados ({arquivados.length})
          </button>
        </div>
      )}

      {aba === "ativos" || !isSystemAdmin ? (
        ativos.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">Nenhum projeto ativo.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ativos.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )
      ) : arquivados.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">Nenhum projeto arquivado.</p>
      ) : (
        <div className="space-y-2">
          {arquivados.map((p) => (
            <ArchivedProjectRow key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

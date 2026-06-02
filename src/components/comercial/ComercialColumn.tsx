"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ComercialCard } from "@/components/comercial/ComercialCard"
import type { EtapaConfig } from "@/lib/comercial"
import type { OportunidadeComResponsavel } from "@/components/comercial/ComercialKanban"

interface Props {
  etapa: EtapaConfig
  oportunidades: OportunidadeComResponsavel[]
  onCardClick: (op: OportunidadeComResponsavel) => void
}

export function ComercialColumn({ etapa, oportunidades, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.enum })

  return (
    <div className="flex flex-col w-[220px] shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide truncate">
          {etapa.label}
        </h3>
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 shrink-0 ml-1">
          {oportunidades.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-lg p-2 flex-1 min-h-[200px] transition-colors ${
          isOver ? "bg-accent" : "bg-muted/30"
        }`}
      >
        <SortableContext items={oportunidades.map((op) => op.id)} strategy={verticalListSortingStrategy}>
          {oportunidades.map((op) => (
            <ComercialCard key={op.id} oportunidade={op} onClick={() => onCardClick(op)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

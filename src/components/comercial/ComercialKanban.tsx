"use client"

import { useState, useEffect } from "react"
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core"
import { EtapaComercial, AtividadeComercial, type Oportunidade, type OportunidadeSubitem, type User } from "@prisma/client"
import { COLUNAS_COMERCIAL, getPrimeiraAtividade } from "@/lib/comercial"
import { ComercialColumn } from "@/components/comercial/ComercialColumn"
import { OportunidadeModal } from "@/components/comercial/OportunidadeModal"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { moveOportunidadeAction } from "@/server/actions/oportunidades"

export type OportunidadeComResponsavel = Oportunidade & {
  responsavel: Pick<User, "id" | "name" | "email"> | null
  subitens: OportunidadeSubitem[]
}

type UserSimples = Pick<User, "id" | "name" | "email">

type ModalState =
  | { mode: "create"; etapaInicial: EtapaComercial }
  | { mode: "edit"; oportunidade: OportunidadeComResponsavel }
  | null

interface Props {
  oportunidades: OportunidadeComResponsavel[]
  users: UserSimples[]
}

export function ComercialKanban({ oportunidades: initial, users }: Props) {
  const [oportunidades, setOportunidades] = useState(initial)
  const [activeOp, setActiveOp] = useState<OportunidadeComResponsavel | null>(null)
  const [dragOrigin, setDragOrigin] = useState<EtapaComercial | null>(null)
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => { setOportunidades(initial) }, [initial])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function findEtapa(id: string): EtapaComercial | null {
    return oportunidades.find((op) => op.id === id)?.etapa ?? null
  }

  function handleDragStart({ active }: DragStartEvent) {
    const op = oportunidades.find((o) => o.id === active.id) ?? null
    setActiveOp(op)
    setDragOrigin(op?.etapa ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const activeEtapa = findEtapa(activeId)
    const overEtapa = COLUNAS_COMERCIAL.find((c) => c.enum === overId)?.enum ?? findEtapa(overId)
    if (!activeEtapa || !overEtapa || activeEtapa === overEtapa) return
    setOportunidades((prev) =>
      prev.map((op) =>
        op.id === activeId
          ? { ...op, etapa: overEtapa, atividade: getPrimeiraAtividade(overEtapa) }
          : op
      )
    )
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveOp(null)
    const origin = dragOrigin
    setDragOrigin(null)
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string
    const overEtapa =
      (COLUNAS_COMERCIAL.find((c) => c.enum === overId)?.enum ?? findEtapa(overId)) as EtapaComercial | null
    if (!overEtapa || origin === overEtapa) return
    await moveOportunidadeAction(activeId, { etapa: overEtapa })
  }

  // Troca de atividade direto no card → move para a coluna da atividade (optimistic)
  async function handleAtividadeChange(id: string, atividade: AtividadeComercial, etapa: EtapaComercial) {
    setOportunidades((prev) =>
      prev.map((op) => (op.id === id ? { ...op, atividade, etapa } : op))
    )
    await moveOportunidadeAction(id, { atividade })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end px-6 py-3 border-b shrink-0">
        <Button size="sm" onClick={() => setModal({ mode: "create", etapaInicial: EtapaComercial.SUSPECT })}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Oportunidade
        </Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 p-4 flex-1 items-start">
          {COLUNAS_COMERCIAL.map((col) => (
            <ComercialColumn
              key={col.enum}
              etapa={col}
              oportunidades={oportunidades.filter((op) => op.etapa === col.enum)}
              onCardClick={(op) => setModal({ mode: "edit", oportunidade: op })}
              onAtividadeChange={handleAtividadeChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOp && (
            <div className="bg-white border rounded-lg p-3 shadow-lg rotate-1 opacity-90 w-[220px]">
              <p className="text-sm font-semibold truncate">{activeOp.cliente}</p>
              {activeOp.produto && <p className="text-xs text-muted-foreground truncate">{activeOp.produto}</p>}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modal && (
        <OportunidadeModal
          key={modal.mode === "edit" ? modal.oportunidade.id : "new"}
          mode={modal.mode}
          oportunidade={modal.mode === "edit" ? modal.oportunidade : undefined}
          etapaInicial={modal.mode === "create" ? modal.etapaInicial : undefined}
          users={users}
          open={true}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

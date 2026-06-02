"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EtapaComercial, AtividadeComercial } from "@prisma/client"
import { getAtividadesDaEtapa, getAtividadeConfig } from "@/lib/comercial"
import type { OportunidadeComResponsavel } from "@/components/comercial/ComercialKanban"

const AVATAR_COLORS = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-rose-500"]

interface Props {
  oportunidade: OportunidadeComResponsavel
  onClick: () => void
  onAtividadeChange: (id: string, atividade: AtividadeComercial, etapa: EtapaComercial) => void
}

export function ComercialCard({ oportunidade, onClick, onAtividadeChange }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: oportunidade.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const valorFormatado =
    oportunidade.valor != null
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(Number(oportunidade.valor))
      : null

  const prazoFormatado =
    oportunidade.prazoFechamento != null
      ? new Date(oportunidade.prazoFechamento).toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        })
      : null

  const inicial = oportunidade.responsavel?.name.charAt(0).toUpperCase()
  const avatarColor = AVATAR_COLORS[oportunidade.cliente.charCodeAt(0) % AVATAR_COLORS.length]

  const atividadesDaColuna = getAtividadesDaEtapa(oportunidade.etapa)
  const isConcluido = oportunidade.etapa === EtapaComercial.CONCLUIDO

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nova = e.target.value as AtividadeComercial
    onAtividadeChange(oportunidade.id, nova, getAtividadeConfig(nova).etapa)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white rounded-lg p-3 shadow-sm border border-border cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="font-semibold text-sm text-foreground mb-0.5 truncate">
        {oportunidade.cliente}
      </div>

      {oportunidade.produto && (
        <div className="text-xs text-muted-foreground mb-1 truncate">{oportunidade.produto}</div>
      )}

      {/* Dropdown de atividade (colunas do funil) ou badge fixo */}
      {atividadesDaColuna.length > 0 ? (
        <select
          value={oportunidade.atividade ?? atividadesDaColuna[0].enum}
          onChange={handleSelectChange}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-xs border border-border rounded-md px-1.5 py-1 my-1 bg-muted/40 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {atividadesDaColuna.map((a) => (
            <option key={a.enum} value={a.enum}>
              {a.label} · {a.pct}%
            </option>
          ))}
        </select>
      ) : isConcluido ? (
        <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 rounded px-1.5 py-0.5 my-1">
          100%
        </span>
      ) : null}

      <div className="flex items-end justify-between mt-2">
        <div className="flex flex-col gap-0.5">
          {valorFormatado && (
            <span className="text-xs font-semibold text-green-600">{valorFormatado}</span>
          )}
          {prazoFormatado && (
            <span className="text-xs text-muted-foreground">{prazoFormatado}</span>
          )}
        </div>

        {inicial && (
          <div
            title={oportunidade.responsavel?.name}
            className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center text-white text-[9px] font-bold`}
          >
            {inicial}
          </div>
        )}
      </div>
    </div>
  )
}

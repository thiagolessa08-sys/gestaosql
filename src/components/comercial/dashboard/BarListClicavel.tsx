"use client"

import { useState } from "react"
import { RelatorioOportunidadesModal } from "./RelatorioOportunidadesModal"
import { getRelatorioVendedorAction } from "@/server/actions/oportunidades"
import { formatBRLCompact } from "@/lib/money"
import { Tag } from "lucide-react"

type Loader = () => Promise<Awaited<ReturnType<typeof getRelatorioVendedorAction>>>

interface Item {
  label: string
  valor: number
  makeLoader: (label: string) => Loader
}

interface Props {
  items: Item[]
  emptyText?: string
}

export function BarListClicavel({ items, emptyText = "Sem dados." }: Props) {
  const [selecionado, setSelecionado] = useState<{ label: string; loader: Loader } | null>(null)
  const max = Math.max(1, ...items.map(i => i.valor))

  if (!items.length) return <p className="text-sm text-[#929bb2]">{emptyText}</p>

  return (
    <>
      <div className="space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelecionado({ label: item.label, loader: item.makeLoader(item.label) })}
            className="w-full text-left rounded-lg -mx-0.5 px-0.5 py-0.5 hover:bg-[#f3f5ff] transition-colors cursor-pointer"
            title={`Ver oportunidades: ${item.label}`}
          >
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="truncate font-semibold text-[#141c30]">{item.label}</span>
              <span className="text-[#586079] shrink-0 ml-2">{formatBRLCompact(item.valor)}</span>
            </div>
            <div className="h-2 rounded-full bg-[#eef1f7] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (item.valor / max) * 100)}%`, background: "linear-gradient(90deg,#2f4bd9,#5b74f0)" }}
              />
            </div>
          </button>
        ))}
      </div>

      {selecionado && (
        <RelatorioOportunidadesModal
          titulo={selecionado.label}
          avatar={<Tag className="w-5 h-5" />}
          loader={selecionado.loader}
          mostrarKpis={false}
          open={true}
          onClose={() => setSelecionado(null)}
        />
      )}
    </>
  )
}

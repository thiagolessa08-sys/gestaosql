"use client"

import { useState } from "react"
import { RelatorioOportunidadesModal } from "./RelatorioOportunidadesModal"
import { getRelatorioEtapaAction } from "@/server/actions/oportunidades"
import { formatBRLCompact } from "@/lib/money"
import { EtapaComercial } from "@prisma/client"
import { Filter } from "lucide-react"
import type { ComercialDashboardData } from "@/server/services/comercialDashboard"

const ETAPA_COLORS: Record<string, string> = {
  SUSPECT: "#c7d0e8", LEAD: "#9fb0e0", PROSPECT_C: "#6f87df",
  PROSPECT_B: "#2f4bd9", PROSPECT_A: "#2640bf",
  CONCLUIDO: "#11a06a", PERDIDO: "#e0524a",
}

interface Props {
  funil: ComercialDashboardData["funil"]
}

export function FunilEtapas({ funil }: Props) {
  const [etapa, setEtapa] = useState<{ enum: EtapaComercial; label: string } | null>(null)
  const maxFunil = Math.max(1, ...funil.map(f => f.valor))

  return (
    <>
      <div className="px-5 py-4 flex flex-col gap-3.5">
        {funil.map(f => {
          const pct = f.valor > 0 ? Math.max(2, (f.valor / maxFunil) * 100) : 0
          const color = ETAPA_COLORS[f.etapa] ?? "#2f4bd9"
          const isEmpty = f.valor === 0 && f.count === 0
          return (
            <button
              key={f.etapa}
              type="button"
              onClick={() => !isEmpty && setEtapa({ enum: f.etapa, label: f.label })}
              disabled={isEmpty}
              className={`text-left w-full rounded-lg -mx-1 px-1 py-0.5 transition-colors ${
                isEmpty ? "cursor-default" : "cursor-pointer hover:bg-[#f3f5ff]"
              }`}
              title={isEmpty ? undefined : `Ver oportunidades em ${f.label}`}
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#141c30]">
                  <span className="w-2 h-2 rounded-[3px] shrink-0" style={{ background: color }} />
                  {f.label}
                </div>
                <span className={`text-[12.5px] font-semibold ${isEmpty ? "text-[#929bb2]" : "text-[#586079]"}`}>
                  <b className={`font-extrabold ${isEmpty ? "text-[#929bb2]" : "text-[#141c30]"}`}>{f.count}</b>
                  {" · "}{formatBRLCompact(f.valor)}
                </span>
              </div>
              <div className="h-[11px] rounded-[7px] bg-[#eef1f7] overflow-hidden">
                <div className="h-full rounded-[7px] transition-all duration-700"
                  style={{ width: `${pct}%`, background: isEmpty ? color : `linear-gradient(90deg, ${color}, ${color}cc)` }} />
              </div>
            </button>
          )
        })}
      </div>

      {etapa && (
        <RelatorioOportunidadesModal
          titulo={etapa.label}
          avatar={<Filter className="w-5 h-5" />}
          loader={() => getRelatorioEtapaAction(etapa.enum)}
          mostrarKpis={false}
          open={true}
          onClose={() => setEtapa(null)}
        />
      )}
    </>
  )
}

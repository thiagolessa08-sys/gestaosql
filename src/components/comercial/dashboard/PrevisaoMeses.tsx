"use client"

import { useState } from "react"
import { RelatorioOportunidadesModal } from "./RelatorioOportunidadesModal"
import { getRelatorioMesFechamentoAction, getRelatorioSemPrazoAction } from "@/server/actions/oportunidades"
import { formatBRLCompact } from "@/lib/money"
import { Calendar } from "lucide-react"
import type { ComercialDashboardData } from "@/server/services/comercialDashboard"

interface Props {
  previsaoMeses: ComercialDashboardData["previsaoMeses"]
}

interface MesSelecionado {
  label: string
  ano: number | null
  mes: number | null // null = sem prazo
}

// Converte label "jun. de 26" → { ano: 2026, mes: 6 }
function parseLabelMes(label: string): { ano: number; mes: number } | null {
  const meses: Record<string, number> = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  }
  const m = label.toLowerCase().match(/([a-z]{3})[\s.]*(?:de\s*)?(\d{2,4})/)
  if (!m) return null
  const mes = meses[m[1]]
  if (!mes) return null
  const anoRaw = parseInt(m[2])
  const ano = anoRaw < 100 ? 2000 + anoRaw : anoRaw
  return { ano, mes }
}

export function PrevisaoMeses({ previsaoMeses }: Props) {
  const [selecionado, setSelecionado] = useState<MesSelecionado | null>(null)
  const maxFc = Math.max(1, ...previsaoMeses.filter(m => m.label !== "Sem prazo").map(m => m.valor))

  function handleClick(item: { label: string; valor: number }) {
    if (item.label === "Sem prazo") {
      setSelecionado({ label: "Sem prazo", ano: null, mes: null })
      return
    }
    const parsed = parseLabelMes(item.label)
    if (parsed) setSelecionado({ label: item.label, ano: parsed.ano, mes: parsed.mes })
  }

  return (
    <>
      <div className="px-5 py-4 flex flex-col gap-4">
        {previsaoMeses.length === 0 ? (
          <p className="text-sm text-[#929bb2]">Sem datas cadastradas.</p>
        ) : previsaoMeses.map((m, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(m)}
            className="grid grid-cols-[74px_1fr_auto] items-center gap-4 text-left w-full rounded-lg -mx-1 px-1 py-0.5 hover:bg-[#f3f5ff] transition-colors cursor-pointer"
            title={`Ver oportunidades de ${m.label}`}
          >
            <span className="text-[13px] font-bold text-[#586079] capitalize">{m.label}</span>
            <div className="h-[14px] rounded-[8px] bg-[#eef1f7] overflow-hidden">
              <div
                className="h-full rounded-[8px]"
                style={{
                  width: `${Math.max(2, (m.valor / maxFc) * 100)}%`,
                  background: "linear-gradient(90deg,#3858e6,#6f54f2)"
                }}
              />
            </div>
            <span className="text-[13.5px] font-extrabold text-[#141c30] min-w-[74px] text-right">{formatBRLCompact(m.valor)}</span>
          </button>
        ))}
      </div>

      {selecionado && (
        <RelatorioOportunidadesModal
          titulo={selecionado.label === "Sem prazo" ? "Sem prazo de fechamento" : `Fechamento: ${selecionado.label}`}
          avatar={<Calendar className="w-5 h-5" />}
          loader={
            selecionado.ano === null
              ? () => getRelatorioSemPrazoAction()
              : () => getRelatorioMesFechamentoAction(selecionado.ano!, selecionado.mes!)
          }
          mostrarKpis={false}
          open={true}
          onClose={() => setSelecionado(null)}
        />
      )}
    </>
  )
}

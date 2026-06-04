"use client"

import { useState } from "react"
import { RelatorioOportunidadesModal } from "./RelatorioOportunidadesModal"
import { getRelatorioVendedorAction } from "@/server/actions/oportunidades"
import { formatBRLCompact } from "@/lib/money"
import type { ComercialDashboardData } from "@/server/services/comercialDashboard"

interface Props {
  ranking: ComercialDashboardData["ranking"]
}

export function RankingTable({ ranking }: Props) {
  const [vendedor, setVendedor] = useState<string | null>(null)

  return (
    <>
      <table className="w-full border-collapse mt-1">
        <thead>
          <tr>
            {["Responsável","Abertas","Valor aberto","Forecast","Ganhos"].map((h, i) => (
              <th key={h} className={`py-2 px-5 text-[11.5px] tracking-[.06em] uppercase text-[#929bb2] font-bold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranking.length === 0 ? (
            <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-[#929bb2]">Sem dados.</td></tr>
          ) : ranking.map(r => (
            <tr
              key={r.responsavel}
              className="border-t border-[#f0f2f8] hover:bg-[#f3f5ff] cursor-pointer transition-colors"
              onClick={() => setVendedor(r.responsavel)}
              title={`Ver relatório de ${r.responsavel}`}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-2.5 font-bold text-[#141c30]">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-[#3a55e6] to-[#6b46f2] flex items-center justify-center text-white font-extrabold text-[13px]">
                    {r.responsavel.charAt(0).toUpperCase()}
                  </div>
                  <span className="hover:underline">{r.responsavel}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-right text-[14.5px] font-semibold text-[#141c30]">{r.abertasCount}</td>
              <td className="px-5 py-4 text-right text-[14.5px] font-semibold text-[#586079]">{formatBRLCompact(r.valorAberto)}</td>
              <td className="px-5 py-4 text-right text-[14.5px] font-semibold text-[#586079]">{formatBRLCompact(r.forecast)}</td>
              <td className="px-5 py-4 text-right text-[14.5px] font-extrabold text-[#0c8a5b]">{formatBRLCompact(r.ganhosValor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {vendedor && (
        <RelatorioOportunidadesModal
          titulo={vendedor}
          avatar={vendedor.charAt(0).toUpperCase()}
          loader={() => getRelatorioVendedorAction(vendedor)}
          mostrarKpis
          open={true}
          onClose={() => setVendedor(null)}
        />
      )}
    </>
  )
}

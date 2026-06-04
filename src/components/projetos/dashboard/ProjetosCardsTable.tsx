"use client"

import { useState } from "react"
import { RelatorioCardsModal } from "./RelatorioCardsModal"
import { getCardsPorProjetoAction } from "@/server/actions/projetosDashboard"
import type { ProjetosDashboardData } from "@/server/services/projetosDashboard"

export function ProjetosCardsTable({ porProjeto }: { porProjeto: ProjetosDashboardData["porProjeto"] }) {
  const [selecionado, setSelecionado] = useState<{ id: string; nome: string } | null>(null)

  return (
    <>
      <table className="w-full border-collapse mt-1">
        <thead>
          <tr>
            {["Projeto", "Total", "Progresso", "Andamento", "Validação", "Concluídos"].map((h, i) => (
              <th key={h} className={`py-2 px-4 text-[11px] tracking-[.06em] uppercase text-[#929bb2] font-bold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {porProjeto.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-[#929bb2]">Sem dados.</td></tr>
          ) : porProjeto.map(r => (
            <tr key={r.projetoId} className="border-t border-[#f0f2f8] hover:bg-[#f3f5ff] cursor-pointer" onClick={() => setSelecionado({ id: r.projetoId, nome: r.nome })}>
              <td className="px-4 py-3.5 font-bold text-[#141c30]">
                <span className="hover:underline">{r.nome}</span>
              </td>
              <td className="px-4 py-3.5 text-right font-semibold text-[#141c30]">{r.total}</td>
              <td className="px-4 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-[#eef1f7] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#11a06a]" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-[#0c8a5b] min-w-[30px]">{r.pct}%</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-right font-semibold text-[#2f4bd9]">{r.doing}</td>
              <td className="px-4 py-3.5 text-right font-semibold text-[#e9a23b]">{r.validation}</td>
              <td className="px-4 py-3.5 text-right font-extrabold text-[#0c8a5b]">{r.done}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selecionado && (
        <RelatorioCardsModal
          titulo={selecionado.nome}
          avatar={selecionado.nome.charAt(0).toUpperCase()}
          loader={() => getCardsPorProjetoAction(selecionado.id)}
          open={true}
          onClose={() => setSelecionado(null)}
        />
      )}
    </>
  )
}

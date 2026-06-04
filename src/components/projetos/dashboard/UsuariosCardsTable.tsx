"use client"

import { useState } from "react"
import { RelatorioCardsModal } from "./RelatorioCardsModal"
import { getCardsPorUsuarioAction } from "@/server/actions/projetosDashboard"
import type { ProjetosDashboardData } from "@/server/services/projetosDashboard"

export function UsuariosCardsTable({ porUsuario }: { porUsuario: ProjetosDashboardData["porUsuario"] }) {
  const [selecionado, setSelecionado] = useState<{ id: string; nome: string } | null>(null)

  return (
    <>
      <table className="w-full border-collapse mt-1">
        <thead>
          <tr>
            {["Responsável", "Total", "Andamento", "Validação", "Concluídos"].map((h, i) => (
              <th key={h} className={`py-2 px-4 text-[11px] tracking-[.06em] uppercase text-[#929bb2] font-bold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {porUsuario.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-[#929bb2]">Sem dados.</td></tr>
          ) : porUsuario.map(r => (
            <tr key={r.usuarioId} className="border-t border-[#f0f2f8] hover:bg-[#f3f5ff] cursor-pointer" onClick={() => setSelecionado({ id: r.usuarioId, nome: r.nome })}>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5 font-bold text-[#141c30]">
                  <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-[#3a55e6] to-[#6b46f2] flex items-center justify-center text-white font-extrabold text-[12px]">
                    {r.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="hover:underline">{r.nome}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-right font-semibold text-[#141c30]">{r.total}</td>
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
          loader={() => getCardsPorUsuarioAction(selecionado.id)}
          open={true}
          onClose={() => setSelecionado(null)}
        />
      )}
    </>
  )
}

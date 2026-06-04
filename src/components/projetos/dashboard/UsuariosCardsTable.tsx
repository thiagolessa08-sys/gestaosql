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
          ) : [...porUsuario].sort((a, b) => {
              if (a.usuarioId === "__sem_responsavel__") return 1
              if (b.usuarioId === "__sem_responsavel__") return -1
              return 0
            }).map(r => {
            const isSem = r.usuarioId === "__sem_responsavel__"
            return (
              <tr
                key={r.usuarioId}
                className={`border-t cursor-pointer ${isSem ? "border-[#f0f2f8] bg-[#f8f9fb] hover:bg-[#f0f2f8]" : "border-[#f0f2f8] hover:bg-[#f3f5ff]"}`}
                onClick={() => setSelecionado({ id: r.usuarioId, nome: r.nome })}
              >
                <td className="px-4 py-3">
                  <div className={`flex items-center gap-2.5 ${isSem ? "text-[#929bb2]" : "font-bold text-[#141c30]"}`}>
                    <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center font-extrabold text-[12px] ${isSem ? "bg-[#e4e8f0] text-[#929bb2]" : "bg-gradient-to-br from-[#3a55e6] to-[#6b46f2] text-white"}`}>
                      {r.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm italic ${isSem ? "text-[#929bb2]" : "font-bold hover:underline"}`}>{r.nome}</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${isSem ? "text-[#929bb2]" : "text-[#141c30]"}`}>{r.total}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${isSem ? "text-[#929bb2]" : "text-[#2f4bd9]"}`}>{r.doing}</td>
                <td className={`px-4 py-3 text-right text-sm font-semibold ${isSem ? "text-[#929bb2]" : "text-[#e9a23b]"}`}>{r.validation}</td>
                <td className={`px-4 py-3 text-right text-sm font-extrabold ${isSem ? "text-[#929bb2]" : "text-[#0c8a5b]"}`}>{r.done}</td>
              </tr>
            )
          })}
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

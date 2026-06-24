"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCardsPorUsuarioAction, getCardsPorProjetoAction } from "@/server/actions/projetosDashboard"

type Card = Awaited<ReturnType<typeof getCardsPorUsuarioAction>>[number]

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", DOING: "Em andamento", VALIDATION: "Validação", DONE: "Concluído",
}
const STATUS_COLOR: Record<string, string> = {
  BACKLOG: "#929bb2", DOING: "#2f4bd9", VALIDATION: "#e9a23b", DONE: "#11a06a",
}
const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#929bb2", MEDIUM: "#2f4bd9", HIGH: "#e9a23b", CRITICAL: "#e0524a",
}
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", CRITICAL: "Crítica",
}

interface Props {
  titulo: string
  avatar: React.ReactNode
  loader: () => Promise<Card[]>
  open: boolean
  onClose: () => void
}

export function RelatorioCardsModal({ titulo, avatar, loader, open, onClose }: Props) {
  const router = useRouter()
  const [cards, setCards] = useState<Card[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirCard(c: Card) {
    const slug = c.project.slug
    const url = c.sprintId
      ? `/projetos/${slug}/sprints/${c.sprintId}/board?card=${c.id}`
      : `/projetos/${slug}/backlog?card=${c.id}`
    onClose()
    router.push(url)
  }

  useEffect(() => {
    if (!open) return
    let cancelado = false
    setLoading(true)
    setErro(null)
    loader()
      .then(data => { if (!cancelado) setCards(data) })
      .catch(() => { if (!cancelado) setErro("Erro ao carregar os dados.") })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [open, titulo]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() { setCards(null); onClose() }

  const doing = cards?.filter(c => c.status === "DOING").length ?? 0
  const validation = cards?.filter(c => c.status === "VALIDATION").length ?? 0
  const done = cards?.filter(c => c.status === "DONE").length ?? 0

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3a55e6] to-[#6b46f2] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
              {avatar}
            </div>
            <DialogTitle className="text-xl">{titulo}</DialogTitle>
          </div>
        </DialogHeader>

        {erro ? (
          <p className="py-12 text-center text-destructive text-sm">{erro}</p>
        ) : loading || !cards ? (
          <p className="py-12 text-center text-muted-foreground text-sm">Carregando...</p>
        ) : (
          <div className="space-y-5 mt-2">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: cards.length, color: "#141c30" },
                { label: "Em andamento", value: doing, color: "#2f4bd9" },
                { label: "Em validação", value: validation, color: "#e9a23b" },
                { label: "Concluídos", value: done, color: "#0c8a5b" },
              ].map(k => (
                <div key={k.label} className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-extrabold mt-1" style={{ color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Lista */}
            {cards.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Nenhum card encontrado.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cards.length} cards</p>
                {cards.map(c => {
                  const prazo = c.dueDate ? new Date(c.dueDate).toLocaleDateString("pt-BR") : null
                  const atrasado = c.dueDate && new Date(c.dueDate) < new Date() && c.status !== "DONE"
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => abrirCard(c)}
                      className="w-full text-left rounded-xl border bg-card p-3.5 hover:border-[#3a55e6]/50 hover:shadow-sm transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold text-[14px] text-[#141c30] truncate">{c.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: STATUS_COLOR[c.status] }}>
                              {STATUS_LABEL[c.status]}
                            </span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full border" style={{ color: PRIORITY_COLOR[c.priority], borderColor: PRIORITY_COLOR[c.priority] + "44" }}>
                              {PRIORITY_LABEL[c.priority]}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{c.project.name}</span>
                            {c.sprint && <span className="text-[11px] text-muted-foreground">· {c.sprint.name}</span>}
                            {c.assignee && <span className="text-[11px] text-muted-foreground">· {c.assignee.name}</span>}
                          </div>
                        </div>
                        {prazo && (
                          <span className={`text-xs font-semibold shrink-0 ${atrasado ? "text-red-600" : "text-muted-foreground"}`}>
                            {atrasado ? "⚠ " : ""}{prazo}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

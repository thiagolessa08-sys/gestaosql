"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getRelatorioVendedorAction } from "@/server/actions/oportunidades"
import { getEtapaConfig, getAtividadeConfig } from "@/lib/comercial"
import { formatBRL, formatBRLCompact } from "@/lib/money"
import { EtapaComercial } from "@prisma/client"
import { CheckSquare, TrendingUp, DollarSign, Trophy, XCircle } from "lucide-react"

type Oportunidade = Awaited<ReturnType<typeof getRelatorioVendedorAction>>[number]

interface Props {
  responsavel: string
  open: boolean
  onClose: () => void
}

const ETAPA_COLORS: Partial<Record<EtapaComercial, string>> = {
  SUSPECT: "#c7d0e8", LEAD: "#9fb0e0", PROSPECT_C: "#6f87df",
  PROSPECT_B: "#2f4bd9", PROSPECT_A: "#2640bf",
  CONCLUIDO: "#11a06a", PERDIDO: "#e0524a",
}

export function VendedorRelatorioModal({ responsavel, open, onClose }: Props) {
  const [ops, setOps] = useState<Oportunidade[] | null>(null)
  const [isPending, startTransition] = useTransition()

  // Load when opened
  if (open && ops === null && !isPending) {
    startTransition(async () => {
      const data = await getRelatorioVendedorAction(responsavel)
      setOps(data)
    })
  }

  // Reset when closed
  function handleClose() {
    setOps(null)
    onClose()
  }

  const abertas = ops?.filter(op => op.etapa !== EtapaComercial.CONCLUIDO && op.etapa !== EtapaComercial.PERDIDO) ?? []
  const concluidas = ops?.filter(op => op.etapa === EtapaComercial.CONCLUIDO) ?? []
  const perdidas = ops?.filter(op => op.etapa === EtapaComercial.PERDIDO) ?? []
  const pipeline = abertas.reduce((s, op) => s + (op.valor ? Number(op.valor) : 0), 0)
  const ganhos = concluidas.reduce((s, op) => s + (op.valor ? Number(op.valor) : 0), 0)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3a55e6] to-[#6b46f2] flex items-center justify-center text-white font-extrabold text-lg shrink-0">
              {responsavel.charAt(0).toUpperCase()}
            </div>
            <DialogTitle className="text-xl">{responsavel}</DialogTitle>
          </div>
        </DialogHeader>

        {isPending || ops === null ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Em aberto", value: String(abertas.length), icon: TrendingUp, color: "#2f4bd9", bg: "#e9eeff" },
                { label: "Pipeline", value: formatBRLCompact(pipeline), icon: DollarSign, color: "#0f9bd1", bg: "#e2f4fb" },
                { label: "Ganhos", value: String(concluidas.length), sub: formatBRLCompact(ganhos), icon: Trophy, color: "#11a06a", bg: "#e4f6ee" },
                { label: "Perdidos", value: String(perdidas.length), icon: XCircle, color: "#e0524a", bg: "#fcebe9" },
              ].map(k => (
                <div key={k.label} className="rounded-xl border bg-card p-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: k.bg, color: k.color }}>
                    <k.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-extrabold tracking-tight">{k.value}</p>
                  {k.sub && <p className="text-xs text-green-600 font-semibold">{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Lista de oportunidades */}
            {ops.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma oportunidade encontrada.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Todas as oportunidades ({ops.length})
                </p>
                {ops.map(op => {
                  const etapaLabel = getEtapaConfig(op.etapa).label
                  const acomp = op.atividade ? getAtividadeConfig(op.atividade) : null
                  const cor = ETAPA_COLORS[op.etapa] ?? "#2f4bd9"
                  const isConcluido = op.etapa === EtapaComercial.CONCLUIDO
                  const isPerdido = op.etapa === EtapaComercial.PERDIDO
                  const feitosCount = op.subitens.filter(s => s.feito).length
                  return (
                    <div key={op.id} className="rounded-xl border bg-card p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[15px] text-[#141c30]">{op.cliente}</span>
                            {op.produto && <span className="text-xs text-muted-foreground">· {op.produto}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: cor + "22", color: cor }}
                            >
                              {etapaLabel}
                              {acomp && ` · ${acomp.label} (${acomp.pct}%)`}
                            </span>
                            {op.origemLead && (
                              <span className="text-[11px] text-muted-foreground">Origem: {op.origemLead}</span>
                            )}
                          </div>
                          {op.descricao && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{op.descricao}</p>
                          )}
                          {op.subitens.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <CheckSquare className="w-3 h-3" />
                              {feitosCount}/{op.subitens.length} atividades
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {op.valor && (
                            <p className={`text-base font-extrabold ${isConcluido ? "text-green-600" : isPerdido ? "text-red-500" : "text-[#141c30]"}`}>
                              {formatBRL(Number(op.valor))}
                            </p>
                          )}
                          {op.prazoFechamento && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {new Date(op.prazoFechamento).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
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

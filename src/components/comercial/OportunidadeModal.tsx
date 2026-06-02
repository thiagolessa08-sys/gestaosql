"use client"

import { useState, useTransition } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { EtapaComercial, AtividadeComercial } from "@prisma/client"
import { ATIVIDADES_COMERCIAL, getAtividadeConfig, getEtapaConfig } from "@/lib/comercial"
import {
  createOportunidadeAction,
  updateOportunidadeAction,
  deleteOportunidadeAction,
} from "@/server/actions/oportunidades"
import type { OportunidadeComResponsavel } from "@/components/comercial/ComercialKanban"

interface UserSimples { id: string; name: string; email: string }

interface Props {
  mode: "create" | "edit"
  oportunidade?: OportunidadeComResponsavel
  etapaInicial?: EtapaComercial
  users: UserSimples[]
  open: boolean
  onClose: () => void
}

export function OportunidadeModal({ mode, oportunidade, etapaInicial, users, open, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // "selecao" representa a atividade escolhida OU os marcadores terminais "CONCLUIDO"/"PERDIDO"
  const selecaoInicial: string = (() => {
    if (oportunidade?.atividade) return oportunidade.atividade
    const etapa = oportunidade?.etapa ?? etapaInicial ?? EtapaComercial.SUSPECT
    if (etapa === EtapaComercial.CONCLUIDO) return EtapaComercial.CONCLUIDO
    if (etapa === EtapaComercial.PERDIDO) return EtapaComercial.PERDIDO
    // primeira atividade da etapa (fallback MAPEAMENTO)
    return ATIVIDADES_COMERCIAL.find((a) => a.etapa === etapa)?.enum ?? AtividadeComercial.MAPEAMENTO
  })()

  const [form, setForm] = useState({
    cliente:         oportunidade?.cliente ?? "",
    produto:         oportunidade?.produto ?? "",
    origemLead:      oportunidade?.origemLead ?? "",
    selecao:         selecaoInicial,
    valor:           oportunidade?.valor != null ? String(oportunidade.valor) : "",
    prazoFechamento: oportunidade?.prazoFechamento
      ? new Date(oportunidade.prazoFechamento).toISOString().split("T")[0]
      : "",
    responsavelId:   oportunidade?.responsavelId ?? "",
    descricao:       oportunidade?.descricao ?? "",
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Deriva { etapa, atividade } a partir da seleção
  function derivarEtapaAtividade(): { etapa: EtapaComercial; atividade: AtividadeComercial | null } {
    if (form.selecao === EtapaComercial.CONCLUIDO) {
      return { etapa: EtapaComercial.CONCLUIDO, atividade: null }
    }
    if (form.selecao === EtapaComercial.PERDIDO) {
      return { etapa: EtapaComercial.PERDIDO, atividade: null }
    }
    const atividade = form.selecao as AtividadeComercial
    return { etapa: getAtividadeConfig(atividade).etapa, atividade }
  }

  function handleSubmit() {
    setError(null)
    const { etapa, atividade } = derivarEtapaAtividade()
    const input = {
      cliente: form.cliente,
      etapa,
      atividade,
      valor: form.valor ? Number(form.valor) : undefined,
      prazoFechamento: form.prazoFechamento ? new Date(form.prazoFechamento) : undefined,
      responsavelId: form.responsavelId || undefined,
      produto: form.produto || undefined,
      origemLead: form.origemLead || undefined,
      descricao: form.descricao || undefined,
    }
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createOportunidadeAction(input)
          : await updateOportunidadeAction(oportunidade!.id, input)
      if (!result.success) { setError(result.error); return }
      onClose()
    })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startTransition(async () => {
      const result = await deleteOportunidadeAction(oportunidade!.id)
      if (!result.success) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nova Oportunidade" : "Editar Oportunidade"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="op-cliente">Cliente *</Label>
            <Input id="op-cliente" value={form.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nome da empresa" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-produto">Produto / Serviço</Label>
            <Input id="op-produto" value={form.produto} onChange={(e) => set("produto", e.target.value)} placeholder="Ex: SQLTech Analytics" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-origem">Origem do Lead</Label>
            <Input id="op-origem" value={form.origemLead} onChange={(e) => set("origemLead", e.target.value)} placeholder="Ex: Indicação" />
          </div>

          <div className="space-y-1.5">
            <Label>Atividade</Label>
            <Select value={form.selecao} onValueChange={(v) => set("selecao", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATIVIDADES_COMERCIAL.map((a) => (
                  <SelectItem key={a.enum} value={a.enum}>
                    {getEtapaConfig(a.etapa).label} — {a.label} · {a.pct}%
                  </SelectItem>
                ))}
                <SelectItem value={EtapaComercial.CONCLUIDO}>Concluído · 100%</SelectItem>
                <SelectItem value={EtapaComercial.PERDIDO}>Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={form.responsavelId || "none"} onValueChange={(v) => set("responsavelId", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-valor">Valor (R$)</Label>
            <Input id="op-valor" type="number" min={0} value={form.valor} onChange={(e) => set("valor", e.target.value)} placeholder="120000" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-prazo">Prazo de Fechamento</Label>
            <Input id="op-prazo" type="date" value={form.prazoFechamento} onChange={(e) => set("prazoFechamento", e.target.value)} />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="op-descricao">Descrição / Observações</Label>
            <Textarea id="op-descricao" rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-1">{error}</p>}

        <DialogFooter className="flex items-center justify-between gap-2 flex-row">
          {mode === "edit" && (
            <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
              {confirmDelete ? "Confirmar exclusão" : "Excluir"}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

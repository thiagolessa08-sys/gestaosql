"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import type { OportunidadeSubitem } from "@prisma/client"
import {
  addSubitemAction,
  toggleSubitemAction,
  deleteSubitemAction,
  updateSubitemDataAction,
} from "@/server/actions/oportunidades"

interface Props {
  oportunidadeId: string
  subitens: OportunidadeSubitem[]
}

function fmt(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

function toInputDate(date: Date | string) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function SubitensSection({ oportunidadeId, subitens: initial }: Props) {
  const router = useRouter()
  const [subitens, setSubitens] = useState<OportunidadeSubitem[]>(initial)
  const [novo, setNovo] = useState("")
  const [novaData, setNovaData] = useState(toInputDate(new Date()))
  const [editandoData, setEditandoData] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const feitos = subitens.filter((s) => s.feito).length

  function handleAdd() {
    const t = novo.trim()
    if (!t) return
    const data = novaData
    setNovo("")
    startTransition(async () => {
      const r = await addSubitemAction(oportunidadeId, t, data)
      if (r.success) {
        setSubitens((prev) => [
          ...prev,
          { ...r.data, oportunidadeId } as OportunidadeSubitem,
        ])
        router.refresh()
      } else {
        setNovo(t)
      }
    })
  }

  function handleEditarData(id: string, data: string) {
    setEditandoData(null)
    setSubitens((prev) =>
      prev.map((s) => (s.id === id ? { ...s, criadoEm: new Date(`${data}T00:00:00`) } : s))
    )
    startTransition(async () => {
      const r = await updateSubitemDataAction(id, data)
      if (r.success) router.refresh()
    })
  }

  function handleToggle(id: string) {
    // optimistic
    setSubitens((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, feito: !s.feito, concluidoEm: !s.feito ? new Date() : null }
          : s
      )
    )
    startTransition(async () => {
      const r = await toggleSubitemAction(id)
      if (r.success) router.refresh()
    })
  }

  function handleDelete(id: string) {
    setSubitens((prev) => prev.filter((s) => s.id !== id))
    startTransition(async () => {
      const r = await deleteSubitemAction(id)
      if (r.success) router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Atividades Realizadas</span>
        {subitens.length > 0 && (
          <span className="text-xs text-muted-foreground">{feitos}/{subitens.length} concluídas</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {subitens.map((s) => (
          <div key={s.id} className="flex items-start gap-2 group">
            <input
              type="checkbox"
              checked={s.feito}
              onChange={() => handleToggle(s.id)}
              className="mt-0.5 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <span className={`text-sm ${s.feito ? "line-through text-muted-foreground" : ""}`}>
                {s.texto}
              </span>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                {editandoData === s.id ? (
                  <input
                    type="date"
                    autoFocus
                    defaultValue={toInputDate(s.criadoEm)}
                    onBlur={(e) => e.target.value && handleEditarData(s.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                      if (e.key === "Escape") setEditandoData(null)
                    }}
                    className="text-[10px] border border-border rounded px-1 py-0.5"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditandoData(s.id)}
                    className="hover:text-foreground hover:underline"
                    title="Editar data"
                  >
                    {fmt(s.criadoEm)}
                  </button>
                )}
                {s.feito && s.concluidoEm && ` · concluído ${fmt(s.concluidoEm)}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(s.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          placeholder="Adicionar atividade..."
          className="h-8 text-sm"
        />
        <Input
          type="date"
          value={novaData}
          onChange={(e) => setNovaData(e.target.value)}
          className="h-8 text-sm w-[130px] shrink-0"
          title="Data da atividade"
        />
        <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAdd} disabled={isPending || !novo.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

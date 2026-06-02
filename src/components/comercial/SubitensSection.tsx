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

export function SubitensSection({ oportunidadeId, subitens: initial }: Props) {
  const router = useRouter()
  const [subitens, setSubitens] = useState<OportunidadeSubitem[]>(initial)
  const [novo, setNovo] = useState("")
  const [isPending, startTransition] = useTransition()

  const feitos = subitens.filter((s) => s.feito).length

  function handleAdd() {
    const t = novo.trim()
    if (!t) return
    setNovo("")
    startTransition(async () => {
      const r = await addSubitemAction(oportunidadeId, t)
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
              <div className="text-[10px] text-muted-foreground">
                {fmt(s.criadoEm)}
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
        <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleAdd} disabled={isPending || !novo.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

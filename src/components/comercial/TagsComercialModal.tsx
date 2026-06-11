"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Tag as TagIcon } from "lucide-react"
import { criarTagComercialAction, deletarTagComercialAction } from "@/server/actions/tagsComercial"

interface Tag { id: string; nome: string; cor: string }

interface Props {
  tags: Tag[]
  canDelete?: boolean
  open: boolean
  onClose: () => void
}

const TAG_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"]

export function TagsComercialModal({ tags: initial, canDelete = false, open, onClose }: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<Tag[]>(initial)
  const [novo, setNovo] = useState("")
  const [cor, setCor] = useState(TAG_COLORS[0])
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function handleAdd() {
    const n = novo.trim()
    if (!n) return
    setErro(null)
    startTransition(async () => {
      const r = await criarTagComercialAction(n, cor)
      if (!r.success) { setErro(r.error); return }
      setTags((prev) => [...prev, r.data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNovo("")
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (confirmId !== id) { setConfirmId(id); return }
    startTransition(async () => {
      const r = await deletarTagComercialAction(id)
      if (!r.success) { setErro(r.error); return }
      setTags((prev) => prev.filter((t) => t.id !== id))
      setConfirmId(null)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="w-5 h-5" />
            Tags
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Adicionar */}
          <div className="flex gap-2 items-center">
            <Input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
              placeholder="Nome da tag..."
              disabled={isPending}
            />
            <div className="flex gap-1 shrink-0">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="w-4 h-4 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: cor === c ? "#000" : "transparent",
                    transform: cor === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <Button size="icon" onClick={handleAdd} disabled={isPending || !novo.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          {/* Lista */}
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tag cadastrada.</p>
          ) : (
            <div className="space-y-1.5">
              {tags.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-card">
                  <span className="flex items-center gap-2 text-sm truncate">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                    {t.nome}
                  </span>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 shrink-0 ${confirmId === t.id ? "text-destructive" : "text-muted-foreground"}`}
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                    >
                      {confirmId === t.id ? "Confirmar" : <Trash2 className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

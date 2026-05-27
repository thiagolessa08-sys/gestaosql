"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { getProjectBacklogCardsAction, bulkAddCardsToSprintAction } from "@/server/actions/cards"

interface Tag {
  id: string
  name: string
  color: string
}

interface BacklogCard {
  id: string
  title: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  mainActivity: { id: string; name: string; color: string } | null
  tags: { tag: Tag }[]
  assignee: { id: string; name: string; avatarUrl: string | null } | null
}

interface Props {
  open: boolean
  onClose: () => void
  projectId: string
  sprintId: string
}

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", className: "text-slate-600 bg-slate-100" },
  MEDIUM: { label: "Média", className: "text-blue-700 bg-blue-50" },
  HIGH: { label: "Alta", className: "text-orange-700 bg-orange-50" },
  CRITICAL: { label: "Crítica", className: "text-red-700 bg-red-50" },
}

export function ImportBacklogDialog({ open, onClose, projectId, sprintId }: Props) {
  const router = useRouter()
  const [cards, setCards] = useState<BacklogCard[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setCards(null)
    setSelectedIds(new Set())
    setSearchQuery("")
    setError(null)

    getProjectBacklogCardsAction(projectId).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.error)
        setCards([])
        return
      }
      setCards(
        (result.data ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          priority: c.priority,
          mainActivity: c.mainActivity,
          tags: c.tags,
          assignee: c.assignee,
        }))
      )
    }).catch(() => {
      if (!cancelled) {
        setError("Não foi possível carregar o backlog.")
        setCards([])
      }
    })

    return () => { cancelled = true }
  }, [open, projectId])

  const filtered = useMemo(() => {
    if (!cards) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => c.title.toLowerCase().includes(q))
  }, [cards, searchQuery])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleImport() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setImporting(true)
    setError(null)
    const result = await bulkAddCardsToSprintAction(ids, sprintId)
    setImporting(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar do backlog do projeto</DialogTitle>
          <DialogDescription>
            Selecione os cards que serão movidos para esta sprint (coluna Backlog).
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título..."
            className="pl-8 h-9"
            disabled={cards === null}
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {cards === null ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {cards.length === 0
                ? "Nenhum card no backlog do projeto."
                : "Nenhum card corresponde à busca."}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((card) => {
                const prio = PRIORITY_CONFIG[card.priority]
                const selected = selectedIds.has(card.id)
                return (
                  <label
                    key={card.id}
                    className={`flex items-start gap-3 p-2 rounded-md border cursor-pointer hover:bg-accent ${
                      selected ? "bg-accent border-primary/30" : "border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(card.id)}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      {card.mainActivity && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: card.mainActivity.color }}
                          />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                            {card.mainActivity.name}
                          </span>
                        </div>
                      )}
                      <p className="text-sm font-medium truncate">{card.title}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${prio.className}`}>
                      {prio.label}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || importing}
          >
            {importing
              ? "Importando..."
              : `Importar ${selectedIds.size} ${selectedIds.size === 1 ? "card" : "cards"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

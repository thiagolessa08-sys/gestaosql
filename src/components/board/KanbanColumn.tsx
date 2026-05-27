"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CardItem } from "./CardItem"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCardAction } from "@/server/actions/cards"
import { Plus, X } from "lucide-react"

interface Card {
  id: string
  title: string
  status: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  _count: { comments: number; checklists: number }
  checklistsDone: number
  mainActivity: { id: string; name: string; color: string } | null
}

interface Props {
  id: string
  title: string
  cards: Card[]
  onCardClick?: (cardId: string) => void
  projectId: string
  sprintId: string
}

export function KanbanColumn({ id, title, cards, onCardClick, projectId, sprintId }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [title_input, setTitleInput] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    const t = title_input.trim()
    if (!t) return
    setLoading(true)
    const fd = new FormData()
    fd.set("title", t)
    fd.set("sprintId", sprintId)
    const result = await createCardAction(projectId, fd)
    setLoading(false)
    if (result.success) {
      setTitleInput("")
      setAdding(false)
      router.refresh()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd()
    if (e.key === "Escape") { setAdding(false); setTitleInput("") }
  }

  return (
    <div className="flex flex-col gap-2 min-w-[260px] flex-1">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <Badge variant="outline" className="text-xs">{cards.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-lg p-2 min-h-[200px] transition-colors ${
          isOver ? "bg-accent" : "bg-muted/30"
        }`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onCardClick={onCardClick} />
          ))}
        </SortableContext>

        {adding ? (
          <div className="flex flex-col gap-1 mt-1">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Título do card..."
              value={title_input}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="text-sm h-8"
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAdd} disabled={loading || !title_input.trim()}>
                {loading ? "Criando..." : "Adicionar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setAdding(false); setTitleInput("") }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground text-xs h-7 mt-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar card
          </Button>
        )}
      </div>
    </div>
  )
}

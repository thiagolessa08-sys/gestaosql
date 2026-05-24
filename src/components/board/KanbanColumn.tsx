"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CardItem } from "./CardItem"
import { Badge } from "@/components/ui/badge"

interface Card {
  id: string
  title: string
  status: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  _count: { comments: number; checklists: number }
}

interface Props {
  id: string
  title: string
  cards: Card[]
  onCardClick?: (cardId: string) => void
}

export function KanbanColumn({ id, title, cards, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

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
      </div>
    </div>
  )
}

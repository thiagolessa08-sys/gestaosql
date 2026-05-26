"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { PriorityBadge } from "@/components/shared/PriorityBadge"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface MainActivity {
  id: string
  name: string
  color: string
}

interface Card {
  id: string
  title: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  _count: { comments: number; checklists: number }
  mainActivity: MainActivity | null
}

interface Props {
  card: Card
  onCardClick?: (cardId: string) => void
}

export function CardItem({ card, onCardClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card border rounded-md p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onCardClick?.(card.id)}
    >
      {card.mainActivity && (
        <div className="flex items-center gap-1 mb-1.5">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: card.mainActivity.color }}
          />
          <span className="text-xs text-muted-foreground truncate">
            {card.mainActivity.name}
          </span>
        </div>
      )}
      <p className="text-sm font-medium mb-2 line-clamp-2">{card.title}</p>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <PriorityBadge priority={card.priority} />
        <div className="flex items-center gap-1">
          {card.storyPoints != null && (
            <Badge variant="outline" className="text-xs h-5 px-1">
              {card.storyPoints}
            </Badge>
          )}
          {card._count.comments > 0 && (
            <span className="text-xs text-muted-foreground">{card._count.comments} 💬</span>
          )}
          {card.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">
                {getInitials(card.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  )
}

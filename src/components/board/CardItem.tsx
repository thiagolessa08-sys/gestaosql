"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, CheckSquare, MessageSquare, User } from "lucide-react"

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", className: "text-slate-600 bg-slate-100" },
  MEDIUM: { label: "Média", className: "text-blue-700 bg-blue-50" },
  HIGH: { label: "Alta", className: "text-orange-700 bg-orange-50" },
  CRITICAL: { label: "Crítica", className: "text-red-700 bg-red-50" },
}

function formatDueDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
}

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
  dueDate: Date | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  _count: { comments: number; checklists: number }
  checklistsDone: number
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

  const prio = PRIORITY_CONFIG[card.priority]
  const hasChecklist = card._count.checklists > 0
  const hasComments = card._count.comments > 0
  const hasAssignee = !!card.assignee

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onCardClick?.(card.id)}
    >
      {/* Activity label */}
      {card.mainActivity && (
        <div className="flex items-center gap-1 mb-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: card.mainActivity.color }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
            {card.mainActivity.name}
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium line-clamp-2 mb-2.5">{card.title}</p>

      {/* Stats row */}
      {(hasChecklist || hasComments || hasAssignee) && (
        <div className="flex items-center gap-3 mb-2.5 text-xs text-muted-foreground">
          {hasChecklist && (
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              <span>{card.checklistsDone}/{card._count.checklists}</span>
            </span>
          )}
          {hasComments && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{card._count.comments}</span>
            </span>
          )}
          {hasAssignee && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>1</span>
            </span>
          )}
        </div>
      )}

      {/* Bottom row: priority | due date | avatar */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${prio.className}`}>
            {prio.label}
          </span>
          {card.dueDate && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDueDate(card.dueDate)}
            </span>
          )}
        </div>
        {card.assignee && (
          <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
            {getInitials(card.assignee.name)}
          </div>
        )}
      </div>
    </div>
  )
}

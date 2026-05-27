"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Calendar } from "lucide-react"

interface Tag {
  id: string
  name: string
  color: string
}

interface SprintLite {
  id: string
  name: string
  status: string
}

interface Card {
  id: string
  title: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  tags: { tag: Tag }[]
  mainActivity: { id: string; name: string; color: string } | null
  _count: { comments: number; checklists: number }
}

interface Props {
  card: Card
  selected: boolean
  onToggleSelect: (id: string) => void
  onOpen: (id: string) => void
  sprints: SprintLite[]
  canMove: boolean
  canArchive: boolean
  onMoveToSprint: (cardId: string, sprintId: string) => void
  onArchive: (cardId: string) => void
}

const PRIORITY_CONFIG = {
  LOW: { label: "Baixa", className: "text-slate-600 bg-slate-100" },
  MEDIUM: { label: "Média", className: "text-blue-700 bg-blue-50" },
  HIGH: { label: "Alta", className: "text-orange-700 bg-orange-50" },
  CRITICAL: { label: "Crítica", className: "text-red-700 bg-red-50" },
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  PLANNED: "Planejada",
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")
}

export function BacklogCardRow({
  card,
  selected,
  onToggleSelect,
  onOpen,
  sprints,
  canMove,
  canArchive,
  onMoveToSprint,
  onArchive,
}: Props) {
  const prio = PRIORITY_CONFIG[card.priority]

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow ${
        selected ? "ring-2 ring-primary/30" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(card.id)}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer mt-1 flex-shrink-0"
        aria-label={`Selecionar ${card.title}`}
      />

      <button
        type="button"
        className="flex-1 min-w-0 text-left"
        onClick={() => onOpen(card.id)}
      >
        {card.mainActivity && (
          <div className="flex items-center gap-1 mb-1">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: card.mainActivity.color }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {card.mainActivity.name}
            </span>
          </div>
        )}

        <p className="text-sm font-medium truncate">{card.title}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${prio.className}`}>
            {prio.label}
          </span>
          {card.storyPoints != null && <span>{card.storyPoints} pts</span>}
          {card.assignee && (
            <span className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-semibold text-primary">
                {getInitials(card.assignee.name)}
              </span>
              {card.assignee.name}
            </span>
          )}
          {card.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(card.dueDate)}
            </span>
          )}
          {card.tags.length > 0 && (
            <span>· {card.tags.length} {card.tags.length === 1 ? "tag" : "tags"}</span>
          )}
          {card._count.comments > 0 && <span>· {card._count.comments} coment.</span>}
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            aria-label="Ações"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onOpen(card.id)}>Abrir</DropdownMenuItem>

          {canMove && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Mover para sprint</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel>Escolha uma sprint</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {sprints.length === 0 ? (
                    <DropdownMenuItem disabled>Nenhuma sprint disponível</DropdownMenuItem>
                  ) : (
                    sprints.map((s) => (
                      <DropdownMenuItem key={s.id} onClick={() => onMoveToSprint(card.id, s.id)}>
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          )}

          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onArchive(card.id)}
              >
                Arquivar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

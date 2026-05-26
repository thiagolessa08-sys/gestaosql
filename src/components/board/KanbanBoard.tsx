"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumn } from "./KanbanColumn"
import { CardDetailModal } from "@/components/cards/CardDetailModal"
import { moveCardAction, reorderCardAction } from "@/server/actions/cards"

type CardStatus = "BACKLOG" | "DOING" | "VALIDATION" | "DONE"

interface MainActivity {
  id: string
  name: string
  color: string
}

interface Card {
  id: string
  title: string
  description: string | null
  status: CardStatus
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assigneeId: string | null
  position: number
  projectId: string
  tags: { tag: { id: string; name: string; color: string } }[]
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  _count: { comments: number; checklists: number }
  mainActivityId: string | null
  mainActivity: MainActivity | null
}

interface Member {
  id: string
  user: { id: string; name: string }
}

interface Tag {
  id: string
  name: string
  color: string
}

const COLUMNS: { id: CardStatus; label: string }[] = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "DOING", label: "Em andamento" },
  { id: "VALIDATION", label: "Validação" },
  { id: "DONE", label: "Concluído" },
]

interface Props {
  initialCards: Card[]
  members: Member[]
  allTags: Tag[]
  currentUserId: string
  projectId: string
  sprintId: string
  activities: MainActivity[]
}

export function KanbanBoard({ initialCards, members, allTags, currentUserId, projectId, sprintId, activities }: Props) {
  const [cards, setCards] = useState<Card[]>(initialCards)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  // Sync when server re-fetches data (e.g. after router.refresh())
  useEffect(() => {
    setCards(initialCards)
  }, [initialCards])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const selectedCard = selectedCardId ? cards.find((c) => c.id === selectedCardId) ?? null : null

  function getCardsByStatus(status: CardStatus) {
    return cards.filter((c) => c.status === status).sort((a, b) => a.position - b.position)
  }

  function findCardColumn(cardId: string): CardStatus | null {
    return cards.find((c) => c.id === cardId)?.status ?? null
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveCard(cards.find((c) => c.id === active.id) ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    const activeCol = findCardColumn(activeId)
    // over.id could be a column id or a card id
    const overCol = COLUMNS.find((c) => c.id === overId)?.id ?? findCardColumn(overId)

    if (!activeCol || !overCol || activeCol === overCol) return

    // Optimistic UI: move card to new column
    setCards((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, status: overCol as CardStatus } : c
      )
    )
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCard(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const card = cards.find((c) => c.id === activeId)
    if (!card) return

    const activeCol = card.status
    const overCol = (COLUMNS.find((c) => c.id === overId)?.id ?? findCardColumn(overId)) as CardStatus | null
    if (!overCol) return

    if (activeCol !== overCol) {
      // Moved to different column — persist status change
      const formData = new FormData()
      formData.set("toStatus", overCol)
      await moveCardAction(activeId, formData)
    } else {
      // Reordered within same column
      const colCards = getCardsByStatus(activeCol)
      const oldIndex = colCards.findIndex((c) => c.id === activeId)
      const newIndex = colCards.findIndex((c) => c.id === overId)
      if (oldIndex !== newIndex && newIndex >= 0) {
        const reordered = arrayMove(colCards, oldIndex, newIndex)
        setCards((prev) => {
          const otherCards = prev.filter((c) => c.status !== activeCol)
          return [...otherCards, ...reordered.map((c, i) => ({ ...c, position: i }))]
        })
        await reorderCardAction(activeId, newIndex)
      }
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.label}
              cards={getCardsByStatus(col.id)}
              onCardClick={(cardId) => setSelectedCardId(cardId)}
              projectId={projectId}
              sprintId={sprintId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="bg-card border rounded-md p-3 shadow-lg rotate-2 opacity-90">
              <p className="text-sm font-medium">{activeCard.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CardDetailModal
          card={{
            id: selectedCard.id,
            projectId: selectedCard.projectId,
            title: selectedCard.title,
            description: selectedCard.description,
            status: selectedCard.status,
            priority: selectedCard.priority,
            storyPoints: selectedCard.storyPoints,
            dueDate: selectedCard.dueDate,
            assigneeId: selectedCard.assigneeId,
            tags: selectedCard.tags,
            mainActivityId: selectedCard.mainActivityId,
          }}
          members={members}
          allTags={allTags}
          activities={activities}
          open={!!selectedCardId}
          onClose={() => setSelectedCardId(null)}
          currentUserId={currentUserId}
        />
      )}
    </>
  )
}

"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { BacklogFilters } from "./BacklogFilters"
import { BacklogCardRow } from "./BacklogCardRow"
import { MoveToSprintMenu } from "./MoveToSprintMenu"
import { CardDetailModal } from "@/components/cards/CardDetailModal"
import { Button } from "@/components/ui/button"
import { addCardToSprintAction, archiveCardAction, bulkAddCardsToSprintAction } from "@/server/actions/cards"

interface Tag {
  id: string
  name: string
  color: string
}

interface Member {
  id: string
  user: { id: string; name: string }
}

interface SprintLite {
  id: string
  name: string
  status: string
}

interface Card {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  storyPoints: number | null
  dueDate: Date | null
  assigneeId: string | null
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  tags: { tag: Tag }[]
  mainActivity: { id: string; name: string; color: string } | null
  mainActivityId?: string | null
  _count: { comments: number; checklists: number }
}

interface Props {
  cards: Card[]
  members: Member[]
  allTags: Tag[]
  sprints: SprintLite[]
  canMove: boolean
  canArchive: boolean
  currentUserId: string
  openCardId?: string
}

type PriorityFilter = "ALL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export function BacklogList({
  cards,
  members,
  allTags,
  sprints,
  canMove,
  canArchive,
  currentUserId,
  openCardId: initialOpenCardId,
}: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [openCardId, setOpenCardId] = useState<string | null>(initialOpenCardId ?? null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL")
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return cards.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q)) return false
      if (priorityFilter !== "ALL" && c.priority !== priorityFilter) return false
      if (assigneeFilter !== "ALL" && c.assigneeId !== assigneeFilter) return false
      return true
    })
  }, [cards, searchQuery, priorityFilter, assigneeFilter])

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) ?? null : null

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearFilters() {
    setSearchQuery("")
    setPriorityFilter("ALL")
    setAssigneeFilter("ALL")
  }

  async function handleMoveSingle(cardId: string, sprintId: string) {
    setActionError(null)
    const result = await addCardToSprintAction(cardId, sprintId)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
    router.refresh()
  }

  async function handleMoveBulk(sprintId: string) {
    setActionError(null)
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const result = await bulkAddCardsToSprintAction(ids, sprintId)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setSelectedIds(new Set())
    router.refresh()
  }

  async function handleArchive(cardId: string) {
    if (!confirm("Arquivar este card?")) return
    setActionError(null)
    const result = await archiveCardAction(cardId)
    if (!result.success) {
      setActionError(result.error)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(cardId)
      return next
    })
    router.refresh()
  }

  return (
    <div>
      <BacklogFilters
        searchQuery={searchQuery}
        priorityFilter={priorityFilter}
        assigneeFilter={assigneeFilter}
        members={members}
        onSearchChange={setSearchQuery}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onClear={clearFilters}
      />

      {selectedIds.size > 0 && canMove && (
        <div className="flex items-center justify-between gap-2 mb-3 p-2.5 rounded-lg bg-accent border">
          <span className="text-sm font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? "card selecionado" : "cards selecionados"}
          </span>
          <div className="flex items-center gap-2">
            <MoveToSprintMenu
              sprints={sprints}
              onMove={handleMoveBulk}
              triggerLabel={`Mover ${selectedIds.size} para sprint`}
            />
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <p className="text-sm text-destructive mb-3">{actionError}</p>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>{cards.length === 0 ? "Nenhum card no backlog." : "Nenhum card corresponde aos filtros."}</p>
          </div>
        ) : (
          filtered.map((card) => (
            <BacklogCardRow
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              onToggleSelect={toggleSelect}
              onOpen={setOpenCardId}
              sprints={sprints}
              canMove={canMove}
              canArchive={canArchive}
              onMoveToSprint={handleMoveSingle}
              onArchive={handleArchive}
            />
          ))
        )}
      </div>

      {openCard && (
        <CardDetailModal
          card={{
            id: openCard.id,
            projectId: openCard.projectId,
            title: openCard.title,
            description: openCard.description,
            status: openCard.status,
            priority: openCard.priority,
            storyPoints: openCard.storyPoints,
            dataInicio: (openCard as { dataInicio?: Date | null }).dataInicio ?? null,
            dueDate: openCard.dueDate,
            assigneeId: openCard.assigneeId,
            tags: openCard.tags,
            mainActivityId: openCard.mainActivityId,
          }}
          members={members}
          allTags={allTags}
          activities={[]}
          open={!!openCardId}
          onClose={() => setOpenCardId(null)}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}

import type { CardStatus, Priority } from "@prisma/client"
import {
  findCardById,
  createCard as createCardRecord,
  updateCard as updateCardRecord,
  archiveCard as archiveCardRecord,
  updateCardStatus,
  updateCardPosition,
  countCardsByStatus,
} from "@/server/repositories/cards"
import { setCardTags } from "@/server/repositories/tags"
import { writeAudit } from "@/server/services/audit"
import { db } from "@/server/db"

interface CreateCardInput {
  projectId: string
  sprintId?: string
  title: string
  description?: string
  assigneeId?: string
  priority: Priority
  storyPoints?: number
  dueDate?: Date
  createdById: string
  tagIds?: string[]
}

export async function createCard(input: CreateCardInput) {
  // Position = count of existing cards in this status/sprint
  const position = await countCardsByStatus(
    input.projectId,
    input.sprintId ?? "",
    "BACKLOG"
  )

  const card = await createCardRecord({
    projectId: input.projectId,
    sprintId: input.sprintId,
    title: input.title,
    description: input.description,
    assigneeId: input.assigneeId,
    priority: input.priority,
    storyPoints: input.storyPoints,
    dueDate: input.dueDate,
    createdById: input.createdById,
    position,
  })

  if (input.tagIds && input.tagIds.length > 0) {
    await setCardTags(card.id, input.tagIds)
  }

  await writeAudit({
    projectId: input.projectId,
    actorId: input.createdById,
    entityType: "card",
    entityId: card.id,
    action: "CREATE",
  })

  return card
}

interface UpdateCardInput {
  cardId: string
  actorId: string
  data: {
    title?: string
    description?: string | null
    assigneeId?: string | null
    priority?: Priority
    storyPoints?: number | null
    dueDate?: Date | null
    tagIds?: string[]
  }
}

export async function updateCard({ cardId, actorId, data }: UpdateCardInput) {
  const card = await findCardById(cardId)
  if (!card) throw new Error("Card não encontrado")

  const { tagIds, ...rest } = data
  const updated = await updateCardRecord(cardId, rest)

  if (tagIds !== undefined) {
    await setCardTags(cardId, tagIds)
  }

  await writeAudit({
    projectId: card.projectId,
    actorId,
    entityType: "card",
    entityId: cardId,
    action: "UPDATE",
    changes: { after: data },
  })

  return updated
}

interface ArchiveCardInput {
  cardId: string
  actorId: string
}

export async function archiveCard({ cardId, actorId }: ArchiveCardInput) {
  const card = await findCardById(cardId)
  if (!card) throw new Error("Card não encontrado")

  const archived = await archiveCardRecord(cardId)

  await writeAudit({
    projectId: card.projectId,
    actorId,
    entityType: "card",
    entityId: cardId,
    action: "DELETE",
  })

  return archived
}

interface MoveCardInput {
  cardId: string
  toStatus: CardStatus
  toPosition?: number
  actorId: string
}

export async function moveCard({ cardId, toStatus, toPosition, actorId }: MoveCardInput) {
  const card = await findCardById(cardId)
  if (!card) throw new Error("Card não encontrado")

  const fromStatus = card.status

  // Calculate position if not provided (append to end of target column)
  let position = toPosition
  if (position === undefined) {
    position = await countCardsByStatus(card.projectId, card.sprintId ?? "", toStatus)
  }

  await updateCardStatus(cardId, toStatus, position)

  // Record status transition (analytics-ready)
  await db.cardStatusTransition.create({
    data: {
      cardId,
      fromStatus,
      toStatus,
      sprintId: card.sprintId,
      movedById: actorId,
    },
  })

  await writeAudit({
    projectId: card.projectId,
    actorId,
    entityType: "card",
    entityId: cardId,
    action: "MOVE",
    changes: { before: { status: fromStatus }, after: { status: toStatus } },
  })
}

export async function reorderCard(cardId: string, newPosition: number) {
  return updateCardPosition(cardId, newPosition)
}

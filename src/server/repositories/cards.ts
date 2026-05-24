import { db } from "@/server/db"
import type { CardStatus, Priority } from "@prisma/client"

export async function findCardById(id: string) {
  return db.card.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, name: true } },
      tags: { include: { tag: true } },
    },
  })
}

export async function findCardsBySprintId(sprintId: string) {
  return db.card.findMany({
    where: { sprintId, archivedAt: null },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true, checklists: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  })
}

export async function findBacklogCards(projectId: string) {
  return db.card.findMany({
    where: { projectId, sprintId: null, archivedAt: null },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true, checklists: true } },
    },
    orderBy: { position: "asc" },
  })
}

export async function createCard(data: {
  projectId: string
  sprintId?: string
  title: string
  description?: string
  assigneeId?: string
  priority: Priority
  storyPoints?: number
  dueDate?: Date
  createdById: string
  position: number
}) {
  return db.card.create({ data })
}

export async function updateCard(
  id: string,
  data: {
    title?: string
    description?: string | null
    assigneeId?: string | null
    priority?: Priority
    storyPoints?: number | null
    dueDate?: Date | null
  }
) {
  return db.card.update({ where: { id }, data })
}

export async function archiveCard(id: string) {
  return db.card.update({
    where: { id },
    data: { archivedAt: new Date() },
  })
}

export async function updateCardStatus(id: string, status: CardStatus, position: number) {
  return db.card.update({
    where: { id },
    data: { status, position },
  })
}

export async function updateCardPosition(id: string, position: number) {
  return db.card.update({
    where: { id },
    data: { position },
  })
}

export async function addCardToSprint(id: string, sprintId: string) {
  return db.card.update({
    where: { id },
    data: { sprintId },
  })
}

export async function countCardsByStatus(projectId: string, sprintId: string, status: CardStatus) {
  return db.card.count({
    where: { projectId, sprintId, status, archivedAt: null },
  })
}

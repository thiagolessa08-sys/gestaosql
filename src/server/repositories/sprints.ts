import { db } from "@/server/db"
import type { SprintStatus } from "@prisma/client"

export async function findSprintById(id: string) {
  return db.sprint.findUnique({ where: { id } })
}

export async function findSprintsByProjectId(projectId: string) {
  return db.sprint.findMany({
    where: { projectId },
    orderBy: { plannedStartDate: "desc" },
  })
}

export async function findSprintsWithProgressByProjectId(projectId: string) {
  return db.sprint.findMany({
    where: { projectId },
    orderBy: { plannedStartDate: "desc" },
    include: {
      _count: { select: { cards: true } },
      cards: {
        where: { status: "DONE", archivedAt: null },
        select: { id: true },
      },
    },
  })
}

export async function findActiveSprintByProjectId(projectId: string) {
  return db.sprint.findFirst({
    where: { projectId, status: "ACTIVE" },
  })
}

export async function createSprint(data: {
  projectId: string
  name: string
  goal?: string
  plannedStartDate: Date
  plannedEndDate: Date
}) {
  return db.sprint.create({ data })
}

export async function updateSprint(
  id: string,
  data: {
    name?: string
    goal?: string | null
    plannedStartDate?: Date
    plannedEndDate?: Date
  }
) {
  return db.sprint.update({ where: { id }, data })
}

export async function startSprint(id: string) {
  return db.sprint.update({
    where: { id },
    data: { status: "ACTIVE", startedAt: new Date() },
  })
}

export async function closeSprint(id: string) {
  return db.sprint.update({
    where: { id },
    data: { status: "COMPLETED", endedAt: new Date() },
  })
}

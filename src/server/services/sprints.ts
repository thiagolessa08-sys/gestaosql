import {
  findSprintById,
  findActiveSprintByProjectId,
  createSprint as createSprintRecord,
  updateSprint as updateSprintRecord,
  startSprint as startSprintRecord,
  closeSprint as closeSprintRecord,
} from "@/server/repositories/sprints"
import { db } from "@/server/db"

interface CreateSprintInput {
  projectId: string
  name: string
  goal?: string
  plannedStartDate: Date
  plannedEndDate: Date
}

export async function createSprint(input: CreateSprintInput) {
  return createSprintRecord(input)
}

export async function updateSprint(
  id: string,
  data: { name?: string; goal?: string | null; plannedStartDate?: Date; plannedEndDate?: Date }
) {
  return updateSprintRecord(id, data)
}

export async function startSprint(sprintId: string) {
  const sprint = await findSprintById(sprintId)
  if (!sprint) throw new Error("Sprint não encontrada")
  if (sprint.status !== "PLANNED") throw new Error("Apenas sprints PLANNED podem ser iniciadas")

  const active = await findActiveSprintByProjectId(sprint.projectId)
  if (active) throw new Error("Já existe uma sprint ativa neste projeto")

  return startSprintRecord(sprintId)
}

interface CloseSprintInput {
  sprintId: string
  destinationSprintId?: string
}

export async function closeSprint({ sprintId, destinationSprintId }: CloseSprintInput) {
  const sprint = await findSprintById(sprintId)
  if (!sprint) throw new Error("Sprint não encontrada")
  if (sprint.status !== "ACTIVE") throw new Error("Apenas sprints ACTIVE podem ser encerradas")

  // Move non-DONE cards to destination sprint or back to backlog
  await db.card.updateMany({
    where: {
      sprintId,
      status: { not: "DONE" },
    },
    data: {
      sprintId: destinationSprintId ?? null,
    },
  })

  return closeSprintRecord(sprintId)
}

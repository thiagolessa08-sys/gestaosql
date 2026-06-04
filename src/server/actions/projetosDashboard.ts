"use server"

import { getRequiredSession } from "@/server/auth/helpers"
import { db } from "@/server/db"

const includeCard = {
  project: { select: { name: true, slug: true } },
  sprint: { select: { name: true } },
  assignee: { select: { id: true, name: true } },
} as const

export async function getCardsPorUsuarioAction(usuarioId: string) {
  await getRequiredSession()
  if (usuarioId === "__sem_responsavel__") {
    return db.card.findMany({
      where: { archivedAt: null, assigneeId: null },
      include: includeCard,
      orderBy: { updatedAt: "desc" },
    })
  }
  return db.card.findMany({
    where: { archivedAt: null, assigneeId: usuarioId },
    include: includeCard,
    orderBy: { updatedAt: "desc" },
  })
}

export async function getCardsPorProjetoAction(projetoId: string) {
  await getRequiredSession()
  return db.card.findMany({
    where: { archivedAt: null, projectId: projetoId },
    include: includeCard,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  })
}

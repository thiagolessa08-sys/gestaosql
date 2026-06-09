"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { createCardSchema, updateCardSchema, moveCardSchema, bulkAddCardsToSprintSchema } from "@/lib/schemas/cards"
import { createCard, updateCard, archiveCard, moveCard, reorderCard } from "@/server/services/cards"
import { findCardById, addCardToSprint, findBacklogCards } from "@/server/repositories/cards"
import { findCommentsByCardId } from "@/server/repositories/comments"
import { findChecklistByCardId } from "@/server/repositories/checklists"
import { findAttachmentsByCardId } from "@/server/repositories/attachments"
import { createTag, deleteTag } from "@/server/repositories/tags"
import { requirePermission, isMember, getMemberRole } from "@/server/permissions"
import { db } from "@/server/db"
import { findSprintById } from "@/server/repositories/sprints"
import { writeAudit } from "@/server/services/audit"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function createCardAction(
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "card:create")
  } catch {
    return { success: false, error: "Sem permissão para criar cards." }
  }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    priority: formData.get("priority") || "MEDIUM",
    storyPoints: formData.get("storyPoints") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    sprintId: formData.get("sprintId") || undefined,
  }
  const parsed = createCardSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const card = await createCard({
    projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    assigneeId: parsed.data.assigneeId,
    priority: parsed.data.priority,
    storyPoints: parsed.data.storyPoints,
    dueDate: parsed.data.dueDate,
    createdById: session.user.id,
    sprintId: (formData.get("sprintId") as string | null) || undefined,
  })

  revalidatePath("/", "layout")
  return { success: true, data: { id: card.id } }
}

export async function updateCardAction(
  cardId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar este card." }
  }

  const tagIdsRaw = formData.get("tagIds") as string | null
  const raw = {
    title: formData.get("title") || undefined,
    description: formData.get("description"),
    assigneeId: formData.get("assigneeId") || null, // empty string → null to allow clearing assignee
    priority: formData.get("priority") || undefined,
    storyPoints: formData.get("storyPoints") || undefined,
    dataInicio: formData.get("dataInicio") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    tagIds: tagIdsRaw ? JSON.parse(tagIdsRaw) : undefined,
    mainActivityId: formData.has("mainActivityId")
      ? (formData.get("mainActivityId") || null)
      : undefined,
  }
  const parsed = updateCardSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await updateCard({ cardId, actorId: session.user.id, data: parsed.data })
  revalidatePath(`/projetos`)
  return { success: true }
}

export async function archiveCardAction(cardId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:archive")
  } catch {
    return { success: false, error: "Sem permissão para arquivar este card." }
  }

  await archiveCard({ cardId, actorId: session.user.id })
  revalidatePath(`/projetos`)
  return { success: true }
}

export async function moveCardAction(
  cardId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:move")
  } catch {
    return { success: false, error: "Sem permissão para mover este card." }
  }

  if (card.sprintId) {
    const sprint = await findSprintById(card.sprintId)
    if (sprint && (sprint.status === "COMPLETED" || sprint.status === "CANCELLED")) {
      return { success: false, error: "Sprint encerrada. Não é possível mover cards." }
    }
  }

  const raw = {
    toStatus: formData.get("toStatus"),
    toPosition: formData.get("toPosition") ? Number(formData.get("toPosition")) : undefined,
  }
  const parsed = moveCardSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await moveCard({
    cardId,
    toStatus: parsed.data.toStatus,
    toPosition: parsed.data.toPosition,
    actorId: session.user.id,
  })

  revalidatePath("/", "layout")
  return { success: true }
}

export async function reorderCardAction(cardId: string, newPosition: number): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:move")
  } catch {
    return { success: false, error: "Sem permissão." }
  }

  if (card.sprintId) {
    const sprint = await findSprintById(card.sprintId)
    if (sprint && (sprint.status === "COMPLETED" || sprint.status === "CANCELLED")) {
      return { success: false, error: "Sprint encerrada. Não é possível mover cards." }
    }
  }

  await reorderCard(cardId, newPosition)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function addCardToSprintAction(cardId: string, sprintId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:move")
  } catch {
    return { success: false, error: "Sem permissão para mover card para sprint." }
  }

  await addCardToSprint(cardId, sprintId)
  revalidatePath(`/projetos`)
  return { success: true }
}

export async function createTagAction(
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ id: string; name: string; color: string }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:manage_tags")
  } catch {
    return { success: false, error: "Sem permissão para criar tags." }
  }

  const name = formData.get("name") as string | null
  const color = formData.get("color") as string | null

  if (!name?.trim()) return { success: false, error: "Nome da tag é obrigatório." }
  if (!color?.trim()) return { success: false, error: "Cor da tag é obrigatória." }

  const tag = await createTag({ projectId, name: name.trim(), color })
  revalidatePath(`/projetos`)
  return { success: true, data: { id: tag.id, name: tag.name, color: tag.color } }
}

export async function deleteTagAction(tagId: string, projectId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:manage_tags")
  } catch {
    return { success: false, error: "Sem permissão para excluir tags." }
  }

  await deleteTag(tagId)
  revalidatePath(`/projetos`)
  return { success: true }
}

export async function bulkAddCardsToSprintAction(
  cardIds: string[],
  sprintId: string
): Promise<ActionResult<{ count: number }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const parsed = bulkAddCardsToSprintSchema.safeParse({ cardIds, sprintId })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
  }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  try {
    await requirePermission(session.user.id, sprint.projectId, "card:move")
  } catch {
    return { success: false, error: "Sem permissão para mover cards." }
  }

  // Carrega todos os cards de uma vez para validar projeto + filtrar válidos
  const cards = await db.card.findMany({
    where: { id: { in: parsed.data.cardIds }, archivedAt: null },
    select: { id: true, projectId: true },
  })

  const validIds = cards
    .filter((c) => c.projectId === sprint.projectId)
    .map((c) => c.id)

  if (validIds.length === 0) {
    return { success: false, error: "Nenhum card válido para importar." }
  }

  await db.card.updateMany({
    where: { id: { in: validIds } },
    data: { sprintId: parsed.data.sprintId, status: "BACKLOG" },
  })

  // Audit log por card (preserva rastreabilidade individual)
  await Promise.all(
    validIds.map((cardId) =>
      writeAudit({
        projectId: sprint.projectId,
        actorId: session.user.id,
        entityType: "card",
        entityId: cardId,
        action: "MOVE",
        changes: { after: { sprintId: parsed.data.sprintId } },
      })
    )
  )

  revalidatePath("/", "layout")
  return { success: true, data: { count: validIds.length } }
}

// ---------------------------------------------------------------------------
// Collaboration data fetchers (called from CardDetailModal via useEffect)
// ---------------------------------------------------------------------------

type CommentData = Awaited<ReturnType<typeof findCommentsByCardId>>[number]
type ChecklistItemData = Awaited<ReturnType<typeof findChecklistByCardId>>[number]
type AttachmentData = Awaited<ReturnType<typeof findAttachmentsByCardId>>[number]

export async function getCardCommentsAction(
  cardId: string
): Promise<ActionResult<CommentData[]>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  const canAccess = await isMember(session.user.id, card.projectId)
  if (!canAccess) return { success: false, error: "Sem permissão." }

  const comments = await findCommentsByCardId(cardId)
  return { success: true, data: comments }
}

export async function getCardChecklistAction(
  cardId: string
): Promise<ActionResult<ChecklistItemData[]>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  const canAccess = await isMember(session.user.id, card.projectId)
  if (!canAccess) return { success: false, error: "Sem permissão." }

  const items = await findChecklistByCardId(cardId)
  return { success: true, data: items }
}

export async function getCardAttachmentsAction(
  cardId: string
): Promise<ActionResult<AttachmentData[]>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  const canAccess = await isMember(session.user.id, card.projectId)
  if (!canAccess) return { success: false, error: "Sem permissão." }

  const attachments = await findAttachmentsByCardId(cardId)
  return { success: true, data: attachments }
}

type BacklogCardData = Awaited<ReturnType<typeof findBacklogCards>>[number]

export async function getProjectBacklogCardsAction(
  projectId: string
): Promise<ActionResult<BacklogCardData[]>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const canAccess = await isMember(session.user.id, projectId)
  if (!canAccess) return { success: false, error: "Sem permissão." }

  // Members só veem cards atribuídos a eles (consistente com a página /backlog)
  const role = await getMemberRole(session.user.id, projectId)
  const isMemberOnly = !session.user.isSystemAdmin && role === "MEMBER"

  const cards = await findBacklogCards(
    projectId,
    isMemberOnly ? session.user.id : undefined
  )

  return { success: true, data: cards }
}

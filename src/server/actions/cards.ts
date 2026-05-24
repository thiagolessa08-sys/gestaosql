"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { createCardSchema, updateCardSchema, moveCardSchema } from "@/lib/schemas/cards"
import { createCard, updateCard, archiveCard, moveCard, reorderCard } from "@/server/services/cards"
import { findCardById, addCardToSprint } from "@/server/repositories/cards"
import { createTag, deleteTag } from "@/server/repositories/tags"
import { requirePermission } from "@/server/permissions"

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

  revalidatePath(`/projetos`)
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
    assigneeId: formData.get("assigneeId"),
    priority: formData.get("priority") || undefined,
    storyPoints: formData.get("storyPoints") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    tagIds: tagIdsRaw ? JSON.parse(tagIdsRaw) : undefined,
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

  revalidatePath(`/projetos`)
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

  await reorderCard(cardId, newPosition)
  revalidatePath(`/projetos`)
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

"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import {
  findChecklistItemById,
  countChecklistItems,
  createChecklistItem as createChecklistItemRepo,
  updateChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from "@/server/repositories/checklists"
import { findCardById } from "@/server/repositories/cards"
import { requirePermission } from "@/server/permissions"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function createChecklistItemAction(
  cardId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar este card." }
  }

  const text = (formData.get("text") as string | null)?.trim()
  if (!text) return { success: false, error: "Texto do item é obrigatório." }

  const position = await countChecklistItems(cardId)
  const item = await createChecklistItemRepo({ cardId, text, position })

  revalidatePath("/projetos")
  return { success: true, data: { id: item.id } }
}

export async function toggleChecklistItemAction(itemId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const item = await findChecklistItemById(itemId)
  if (!item) return { success: false, error: "Item não encontrado." }

  const card = await findCardById(item.cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar este card." }
  }

  const isDone = !item.isDone
  await toggleChecklistItem(itemId, isDone, isDone ? session.user.id : undefined)

  revalidatePath("/projetos")
  return { success: true }
}

export async function updateChecklistItemAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const item = await findChecklistItemById(itemId)
  if (!item) return { success: false, error: "Item não encontrado." }

  const card = await findCardById(item.cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar este card." }
  }

  const text = (formData.get("text") as string | null)?.trim()
  if (!text) return { success: false, error: "Texto do item é obrigatório." }

  await updateChecklistItem(itemId, text)

  revalidatePath("/projetos")
  return { success: true }
}

export async function deleteChecklistItemAction(itemId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const item = await findChecklistItemById(itemId)
  if (!item) return { success: false, error: "Item não encontrado." }

  const card = await findCardById(item.cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "card:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar este card." }
  }

  await deleteChecklistItem(itemId)

  revalidatePath("/projetos")
  return { success: true }
}

export async function reorderChecklistItemsAction(
  cardId: string,
  orderedIds: string[]
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

  const items = orderedIds.map((id, index) => ({ id, position: index }))
  await reorderChecklistItems(items)

  revalidatePath("/projetos")
  return { success: true }
}

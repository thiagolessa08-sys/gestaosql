"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { createCommentSchema, updateCommentSchema } from "@/lib/schemas/comments"
import { findCommentById } from "@/server/repositories/comments"
import { findCardById } from "@/server/repositories/cards"
import { createComment, updateComment, deleteComment } from "@/server/services/comments"
import { requirePermission } from "@/server/permissions"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function createCommentAction(
  cardId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const card = await findCardById(cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await requirePermission(session.user.id, card.projectId, "comment:create")
  } catch {
    return { success: false, error: "Sem permissão para comentar." }
  }

  const raw = { body: formData.get("body") }
  const parsed = createCommentSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const comment = await createComment({
    cardId,
    authorId: session.user.id,
    body: parsed.data.body,
  })

  revalidatePath("/projetos")
  return { success: true, data: { id: comment.id } }
}

export async function updateCommentAction(
  commentId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const comment = await findCommentById(commentId)
  if (!comment) return { success: false, error: "Comentário não encontrado." }

  if (comment.authorId !== session.user.id) {
    return { success: false, error: "Apenas o autor pode editar este comentário." }
  }

  const card = await findCardById(comment.cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    // No "comment:edit" permission exists — "comment:create" covers both create and update
    await requirePermission(session.user.id, card.projectId, "comment:create")
  } catch {
    return { success: false, error: "Sem permissão para editar comentário." }
  }

  const raw = { body: formData.get("body") }
  const parsed = updateCommentSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await updateComment({ commentId, authorId: session.user.id, body: parsed.data.body })

  revalidatePath("/projetos")
  return { success: true }
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const comment = await findCommentById(commentId)
  if (!comment) return { success: false, error: "Comentário não encontrado." }

  const card = await findCardById(comment.cardId)
  if (!card) return { success: false, error: "Card não encontrado." }

  try {
    await deleteComment({ commentId, actorId: session.user.id, projectId: card.projectId })
  } catch (err) {
    const message = err instanceof Error ? err.message : undefined
    return { success: false, error: message ?? "Erro ao excluir comentário." }
  }

  revalidatePath("/projetos")
  return { success: true }
}

import {
  findCommentById,
  createComment as createCommentRecord,
  updateComment as updateCommentRecord,
  softDeleteComment,
} from "@/server/repositories/comments"
import { findCardById } from "@/server/repositories/cards"
import { findProjectById } from "@/server/repositories/projects"
import { findUserById } from "@/server/repositories/users"
import { findMemberByUserAndProject } from "@/server/repositories/members"
import { writeAudit } from "@/server/services/audit"
import { notifyComment } from "@/server/services/notifications"

interface CreateCommentInput {
  cardId: string
  authorId: string
  body: string
}

export async function createComment(input: CreateCommentInput) {
  const card = await findCardById(input.cardId)
  if (!card) throw new Error("Card não encontrado")

  const comment = await createCommentRecord({
    cardId: input.cardId,
    authorId: input.authorId,
    body: input.body,
  })

  await writeAudit({
    projectId: card.projectId,
    actorId: input.authorId,
    entityType: "comment",
    entityId: comment.id,
    action: "COMMENT",
  })

  // Notify the card's assignee if they are different from the comment author
  if (card.assigneeId && card.assigneeId !== input.authorId) {
    try {
      const [author, project] = await Promise.all([
        findUserById(input.authorId),
        findProjectById(card.projectId),
      ])
      if (author && project) {
        await notifyComment({
          authorId: input.authorId,
          authorName: author.name,
          recipientId: card.assigneeId,
          cardId: input.cardId,
          cardTitle: card.title,
          commentBody: input.body,
          projectId: card.projectId,
          projectSlug: project.slug,
          sprintId: card.sprintId ?? null,
        })
      }
    } catch {
      // Notification failure is non-fatal
    }
  }

  return comment
}

interface UpdateCommentInput {
  commentId: string
  authorId: string
  body: string
}

export async function updateComment({ commentId, authorId, body }: UpdateCommentInput) {
  const comment = await findCommentById(commentId)
  if (!comment) throw new Error("Comentário não encontrado")
  if (comment.authorId !== authorId) throw new Error("Sem permissão para editar este comentário")

  return updateCommentRecord(commentId, body)
}

interface DeleteCommentInput {
  commentId: string
  actorId: string
  projectId: string
}

export async function deleteComment({ commentId, actorId, projectId }: DeleteCommentInput) {
  const comment = await findCommentById(commentId)
  if (!comment) throw new Error("Comentário não encontrado")

  const member = await findMemberByUserAndProject(actorId, projectId)
  const isAuthor = comment.authorId === actorId
  const canDeleteOthers = member?.role === "ADMIN" || member?.role === "SCRUM_MASTER"

  if (!isAuthor && !canDeleteOthers) {
    throw new Error("Sem permissão para excluir este comentário")
  }

  return softDeleteComment(commentId)
}

import { db } from "@/server/db"

export async function findCommentsByCardId(cardId: string) {
  return db.comment.findMany({
    where: { cardId, deletedAt: null },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function findCommentById(id: string) {
  return db.comment.findUnique({ where: { id } })
}

export async function createComment(data: {
  cardId: string
  authorId: string
  body: string
}) {
  return db.comment.create({ data })
}

export async function updateComment(id: string, body: string) {
  return db.comment.update({ where: { id }, data: { body } })
}

export async function softDeleteComment(id: string) {
  return db.comment.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

import { db } from "@/server/db"

export async function findAttachmentsByCardId(cardId: string) {
  return db.attachment.findMany({
    where: { cardId, deletedAt: null },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { uploadedAt: "desc" },
  })
}

export async function findAttachmentById(id: string) {
  return db.attachment.findUnique({ where: { id } })
}

export async function createAttachment(data: {
  cardId: string
  uploadedById: string
  filename: string
  mimeType: string
  sizeBytes: number
  storagePath: string
}) {
  return db.attachment.create({ data })
}

export async function softDeleteAttachment(id: string) {
  return db.attachment.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

export async function sumAttachmentSizeByCard(cardId: string) {
  const result = await db.attachment.aggregate({
    where: { cardId, deletedAt: null },
    _sum: { sizeBytes: true },
  })
  return result._sum.sizeBytes ?? 0
}

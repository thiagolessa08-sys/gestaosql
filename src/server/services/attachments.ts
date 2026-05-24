import path from "path"
import fs from "fs/promises"
import { randomUUID } from "crypto"
import {
  createAttachment,
  softDeleteAttachment,
  sumAttachmentSizeByCard,
  findAttachmentById,
} from "@/server/repositories/attachments"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_CARD_TOTAL = 50 * 1024 * 1024 // 50MB

function getStorageRoot() {
  return process.env.ATTACHMENT_STORAGE_PATH ?? "./data/attachments"
}

export function getAttachmentPath(projectId: string, cardId: string, filename: string) {
  return path.join(getStorageRoot(), projectId, cardId, filename)
}

export async function saveAttachment(params: {
  cardId: string
  projectId: string
  uploadedById: string
  filename: string
  mimeType: string
  buffer: Buffer
}) {
  if (params.buffer.length > MAX_FILE_SIZE) {
    throw new Error("Arquivo muito grande. Máximo 10MB por arquivo.")
  }

  const currentTotal = await sumAttachmentSizeByCard(params.cardId)
  if (currentTotal + params.buffer.length > MAX_CARD_TOTAL) {
    throw new Error("Limite de 50MB de anexos por card atingido.")
  }

  const uniqueFilename = `${randomUUID()}-${params.filename}`
  const storagePath = getAttachmentPath(params.projectId, params.cardId, uniqueFilename)

  // Ensure directory exists
  await fs.mkdir(path.dirname(storagePath), { recursive: true })
  await fs.writeFile(storagePath, params.buffer)

  return createAttachment({
    cardId: params.cardId,
    uploadedById: params.uploadedById,
    filename: params.filename,
    mimeType: params.mimeType,
    sizeBytes: params.buffer.length,
    storagePath,
  })
}

export async function removeAttachment(attachmentId: string) {
  const attachment = await findAttachmentById(attachmentId)
  if (!attachment) throw new Error("Anexo não encontrado")

  // Try to delete file from disk (non-fatal if missing)
  try {
    await fs.unlink(attachment.storagePath)
  } catch {
    // File may already be gone — soft delete the DB record anyway
  }

  return softDeleteAttachment(attachmentId)
}

export async function getAttachmentFile(attachmentId: string) {
  const attachment = await findAttachmentById(attachmentId)
  if (!attachment || attachment.deletedAt) throw new Error("Anexo não encontrado")

  const buffer = await fs.readFile(attachment.storagePath)
  return { buffer, filename: attachment.filename, mimeType: attachment.mimeType }
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth/config"
import { findAttachmentById } from "@/server/repositories/attachments"
import { findCardById } from "@/server/repositories/cards"
import { isMember } from "@/server/permissions"
import { getAttachmentFile, removeAttachment } from "@/server/services/attachments"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const attachment = await findAttachmentById(id)
  if (!attachment || attachment.deletedAt) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 })
  }

  const card = await findCardById(attachment.cardId)
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 })
  }

  const canAccess = await isMember(session.user.id, card.projectId)
  if (!canAccess) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  try {
    const { buffer, filename, mimeType } = await getAttachmentFile(id)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch {
    return NextResponse.json({ error: "Arquivo não disponível" }, { status: 404 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const attachment = await findAttachmentById(id)
  if (!attachment || attachment.deletedAt) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 })
  }

  const card = await findCardById(attachment.cardId)
  if (!card) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 })
  }

  const canAccess = await isMember(session.user.id, card.projectId)
  if (!canAccess) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  // Only uploader or admins can delete — simplified: any member for now
  await removeAttachment(id)
  return NextResponse.json({ success: true })
}

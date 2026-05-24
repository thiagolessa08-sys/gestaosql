import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth/config"
import { findCardById } from "@/server/repositories/cards"
import { isMember } from "@/server/permissions"
import { saveAttachment } from "@/server/services/attachments"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const cardId = formData.get("cardId") as string | null

    if (!file || !cardId) {
      return NextResponse.json({ error: "Arquivo e cardId são obrigatórios" }, { status: 400 })
    }

    const card = await findCardById(cardId)
    if (!card) {
      return NextResponse.json({ error: "Card não encontrado" }, { status: 404 })
    }

    const canAccess = await isMember(session.user.id, card.projectId)
    if (!canAccess) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const attachment = await saveAttachment({
      cardId,
      projectId: card.projectId,
      uploadedById: session.user.id,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    })

    return NextResponse.json({
      id: attachment.id,
      filename: attachment.filename,
      url: `/api/attachments/${attachment.id}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer upload"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

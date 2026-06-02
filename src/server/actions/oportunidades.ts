"use server"

import { revalidatePath } from "next/cache"
import { getRequiredSession } from "@/server/auth/helpers"
import * as service from "@/server/services/oportunidades"
import { oportunidadeSchema } from "@/lib/schemas/oportunidades"
import { EtapaComercial } from "@prisma/client"

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function createOportunidadeAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getRequiredSession()
    const parsed = oportunidadeSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
    }
    const op = await service.createOportunidade(parsed.data, session.user.id)
    revalidatePath("/comercial")
    return { success: true, data: { id: op.id } }
  } catch {
    return { success: false, error: "Erro ao criar oportunidade." }
  }
}

export async function updateOportunidadeAction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    const parsed = oportunidadeSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }
    }
    await service.updateOportunidade(id, parsed.data)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao atualizar oportunidade." }
  }
}

export async function moveOportunidadeEtapaAction(
  id: string,
  etapa: EtapaComercial
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.moveOportunidadeEtapa(id, etapa)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao mover oportunidade." }
  }
}

export async function deleteOportunidadeAction(
  id: string
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.deleteOportunidade(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao excluir oportunidade." }
  }
}

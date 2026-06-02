"use server"

import { revalidatePath } from "next/cache"
import { getRequiredSession } from "@/server/auth/helpers"
import * as service from "@/server/services/oportunidades"
import { oportunidadeSchema } from "@/lib/schemas/oportunidades"
import { EtapaComercial, AtividadeComercial } from "@prisma/client"

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

export async function moveOportunidadeAction(
  id: string,
  payload: { atividade: AtividadeComercial } | { etapa: EtapaComercial }
): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.moveOportunidade(id, payload)
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

export async function addSubitemAction(
  oportunidadeId: string,
  texto: string
): Promise<ActionResult<{ id: string; texto: string; feito: boolean; criadoEm: Date; concluidoEm: Date | null }>> {
  try {
    await getRequiredSession()
    const t = texto.trim()
    if (!t) return { success: false, error: "Texto é obrigatório." }
    const item = await service.addSubitem(oportunidadeId, t)
    revalidatePath("/comercial")
    return {
      success: true,
      data: {
        id: item.id,
        texto: item.texto,
        feito: item.feito,
        criadoEm: item.criadoEm,
        concluidoEm: item.concluidoEm,
      },
    }
  } catch {
    return { success: false, error: "Erro ao adicionar atividade." }
  }
}

export async function toggleSubitemAction(id: string): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.toggleSubitem(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao atualizar atividade." }
  }
}

export async function deleteSubitemAction(id: string): Promise<ActionResult> {
  try {
    await getRequiredSession()
    await service.deleteSubitem(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao excluir atividade." }
  }
}

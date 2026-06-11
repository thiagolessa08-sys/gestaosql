"use server"

import { revalidatePath } from "next/cache"
import { getRequiredSession } from "@/server/auth/helpers"
import * as service from "@/server/services/oportunidades"
import { oportunidadeSchema } from "@/lib/schemas/oportunidades"
import { EtapaComercial, AtividadeComercial } from "@prisma/client"
import { findOportunidadesPorResponsavel, findOportunidadesPorEtapa, findOportunidadesPorMesFechamento, findOportunidadesSemPrazo, findOportunidadesPorProduto, findOportunidadesPorOrigemLead } from "@/server/repositories/oportunidades"

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
    const session = await getRequiredSession()
    const { podeApagarOportunidade } = await import("@/lib/acesso")
    if (!podeApagarOportunidade(session.user)) {
      return { success: false, error: "Sem permissão para excluir oportunidades." }
    }
    await service.deleteOportunidade(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao excluir oportunidade." }
  }
}

export async function getRelatorioVendedorAction(responsavelNome: string) {
  await getRequiredSession()
  return findOportunidadesPorResponsavel(responsavelNome)
}

export async function getRelatorioEtapaAction(etapa: EtapaComercial) {
  await getRequiredSession()
  return findOportunidadesPorEtapa(etapa)
}

export async function getRelatorioMesFechamentoAction(ano: number, mes: number) {
  await getRequiredSession()
  return findOportunidadesPorMesFechamento(ano, mes)
}

export async function getRelatorioSemPrazoAction() {
  await getRequiredSession()
  return findOportunidadesSemPrazo()
}

export async function getRelatorioProdutoAction(produto: string) {
  await getRequiredSession()
  return findOportunidadesPorProduto(produto)
}

export async function getRelatorioOrigemLeadAction(origem: string) {
  await getRequiredSession()
  return findOportunidadesPorOrigemLead(origem)
}

/** Parseia "YYYY-MM-DD" como data local (meia-noite no fuso do servidor). */
function parseLocalDate(value?: string): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

export async function addSubitemAction(
  oportunidadeId: string,
  texto: string,
  data?: string
): Promise<ActionResult<{ id: string; texto: string; feito: boolean; criadoEm: Date; concluidoEm: Date | null }>> {
  try {
    await getRequiredSession()
    const t = texto.trim()
    if (!t) return { success: false, error: "Texto é obrigatório." }
    const item = await service.addSubitem(oportunidadeId, t, parseLocalDate(data))
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

export async function updateSubitemDataAction(
  id: string,
  data: string
): Promise<ActionResult<{ criadoEm: Date }>> {
  try {
    await getRequiredSession()
    const parsed = parseLocalDate(data)
    if (!parsed) return { success: false, error: "Data inválida." }
    const item = await service.updateSubitemData(id, parsed)
    revalidatePath("/comercial")
    return { success: true, data: { criadoEm: item.criadoEm } }
  } catch {
    return { success: false, error: "Erro ao atualizar data." }
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

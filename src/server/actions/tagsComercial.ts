"use server"

import { revalidatePath } from "next/cache"
import { getRequiredSession } from "@/server/auth/helpers"
import { isAdminComercial } from "@/lib/acesso"
import {
  findAllTagsComercial,
  createTagComercial,
  deleteTagComercial,
} from "@/server/repositories/tagsComercial"

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function listarTagsComercialAction() {
  await getRequiredSession()
  return findAllTagsComercial()
}

export async function criarTagComercialAction(
  nome: string,
  cor: string
): Promise<ActionResult<{ id: string; nome: string; cor: string }>> {
  await getRequiredSession()
  const n = nome.trim()
  if (!n) return { success: false, error: "Nome é obrigatório." }
  if (!cor) return { success: false, error: "Cor é obrigatória." }
  try {
    const t = await createTagComercial(n, cor)
    revalidatePath("/comercial")
    return { success: true, data: { id: t.id, nome: t.nome, cor: t.cor } }
  } catch (err) {
    const msg = err instanceof Error && err.message.includes("Unique")
      ? "Já existe uma tag com esse nome."
      : "Erro ao criar tag."
    return { success: false, error: msg }
  }
}

export async function deletarTagComercialAction(id: string): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!isAdminComercial(session.user)) {
    return { success: false, error: "Sem permissão para excluir tags." }
  }
  try {
    await deleteTagComercial(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao excluir tag." }
  }
}

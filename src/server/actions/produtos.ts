"use server"

import { revalidatePath } from "next/cache"
import { getRequiredSession } from "@/server/auth/helpers"
import { isAdminComercial } from "@/lib/acesso"
import { findAllProdutos, createProduto, deleteProduto } from "@/server/repositories/produtos"

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function listarProdutosAction() {
  await getRequiredSession()
  return findAllProdutos()
}

export async function criarProdutoAction(nome: string): Promise<ActionResult<{ id: string; nome: string }>> {
  const session = await getRequiredSession()
  if (!isAdminComercial(session.user)) {
    return { success: false, error: "Sem permissão para gerenciar produtos." }
  }
  const n = nome.trim()
  if (!n) return { success: false, error: "Nome é obrigatório." }
  try {
    const p = await createProduto(n)
    revalidatePath("/comercial")
    return { success: true, data: { id: p.id, nome: p.nome } }
  } catch (err) {
    const msg = err instanceof Error && err.message.includes("Unique")
      ? "Já existe um produto com esse nome."
      : "Erro ao criar produto."
    return { success: false, error: msg }
  }
}

export async function deletarProdutoAction(id: string): Promise<ActionResult> {
  const session = await getRequiredSession()
  if (!isAdminComercial(session.user)) {
    return { success: false, error: "Sem permissão para gerenciar produtos." }
  }
  try {
    await deleteProduto(id)
    revalidatePath("/comercial")
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: "Erro ao excluir produto." }
  }
}

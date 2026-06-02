import * as repo from "@/server/repositories/oportunidades"
import type { OportunidadeInput } from "@/lib/schemas/oportunidades"
import type { EtapaComercial, AtividadeComercial } from "@prisma/client"
import { getEtapaDaAtividade, getPrimeiraAtividade } from "@/lib/comercial"

export async function findAllOportunidades() {
  return repo.findAllOportunidades()
}

export async function createOportunidade(data: OportunidadeInput, createdById: string) {
  return repo.createOportunidade({ ...data, createdById })
}

export async function updateOportunidade(id: string, data: OportunidadeInput) {
  const existing = await repo.findOportunidadeById(id)
  if (!existing) throw new Error("Oportunidade não encontrada")
  return repo.updateOportunidade(id, data)
}

/**
 * Move bidirecional:
 * - payload.atividade → grava atividade + etapa derivada da atividade
 * - payload.etapa (drag) → grava etapa + primeira atividade da coluna (null p/ Concluído/Perdido)
 */
export async function moveOportunidade(
  id: string,
  payload: { atividade: AtividadeComercial } | { etapa: EtapaComercial }
) {
  if ("atividade" in payload) {
    return repo.moveOportunidade(id, {
      atividade: payload.atividade,
      etapa: getEtapaDaAtividade(payload.atividade),
    })
  }
  return repo.moveOportunidade(id, {
    etapa: payload.etapa,
    atividade: getPrimeiraAtividade(payload.etapa),
  })
}

export async function deleteOportunidade(id: string) {
  const existing = await repo.findOportunidadeById(id)
  if (!existing) throw new Error("Oportunidade não encontrada")
  return repo.deleteOportunidade(id)
}

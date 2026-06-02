import * as repo from "@/server/repositories/oportunidades"
import type { OportunidadeInput } from "@/lib/schemas/oportunidades"
import type { EtapaComercial } from "@prisma/client"

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

export async function moveOportunidadeEtapa(id: string, etapa: EtapaComercial) {
  return repo.moveOportunidadeEtapa(id, etapa)
}

export async function deleteOportunidade(id: string) {
  const existing = await repo.findOportunidadeById(id)
  if (!existing) throw new Error("Oportunidade não encontrada")
  return repo.deleteOportunidade(id)
}

import { db } from "@/server/db"
import type { OportunidadeInput } from "@/lib/schemas/oportunidades"
import type { EtapaComercial, AtividadeComercial } from "@prisma/client"

const includeResponsavel = {
  responsavel: {
    select: { id: true, name: true, email: true },
  },
} as const

export async function findAllOportunidades() {
  return db.oportunidade.findMany({
    orderBy: { createdAt: "desc" },
    include: includeResponsavel,
  })
}

export async function findOportunidadeById(id: string) {
  return db.oportunidade.findUnique({
    where: { id },
    include: includeResponsavel,
  })
}

export async function createOportunidade(
  data: OportunidadeInput & { createdById: string }
) {
  return db.oportunidade.create({
    data,
    include: includeResponsavel,
  })
}

export async function updateOportunidade(id: string, data: OportunidadeInput) {
  return db.oportunidade.update({
    where: { id },
    data,
    include: includeResponsavel,
  })
}

export async function moveOportunidade(
  id: string,
  data: { etapa: EtapaComercial; atividade: AtividadeComercial | null }
) {
  return db.oportunidade.update({ where: { id }, data })
}

export async function deleteOportunidade(id: string) {
  return db.oportunidade.delete({ where: { id } })
}

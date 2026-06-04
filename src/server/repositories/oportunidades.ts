import { db } from "@/server/db"
import type { OportunidadeInput } from "@/lib/schemas/oportunidades"
import { EtapaComercial } from "@prisma/client"
import type { AtividadeComercial } from "@prisma/client"

const includeResponsavel = {
  responsavel: {
    select: { id: true, name: true, email: true },
  },
  subitens: {
    orderBy: { criadoEm: "asc" },
  },
} as const

export async function findAllOportunidades(filtroUsuario?: string) {
  const where = filtroUsuario
    ? { OR: [{ createdById: filtroUsuario }, { responsavelId: filtroUsuario }] }
    : undefined
  return db.oportunidade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: includeResponsavel,
  })
}

export async function findOportunidadesPorResponsavel(responsavelNome: string) {
  return db.oportunidade.findMany({
    where: { responsavel: { name: { contains: responsavelNome, mode: "insensitive" } } },
    include: {
      responsavel: { select: { id: true, name: true, email: true } },
      subitens: { orderBy: { criadoEm: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function findOportunidadesPorMesFechamento(ano: number, mes: number) {
  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 1)
  return db.oportunidade.findMany({
    where: {
      prazoFechamento: { gte: inicio, lt: fim },
    },
    include: {
      responsavel: { select: { id: true, name: true, email: true } },
      subitens: { orderBy: { criadoEm: "asc" } },
    },
    orderBy: { valor: "desc" },
  })
}

export async function findOportunidadesSemPrazo() {
  return db.oportunidade.findMany({
    where: {
      etapa: { notIn: [EtapaComercial.CONCLUIDO, EtapaComercial.PERDIDO] },
      prazoFechamento: null,
    },
    include: {
      responsavel: { select: { id: true, name: true, email: true } },
      subitens: { orderBy: { criadoEm: "asc" } },
    },
    orderBy: { valor: "desc" },
  })
}

export async function findOportunidadesPorEtapa(etapa: EtapaComercial) {
  return db.oportunidade.findMany({
    where: { etapa },
    include: {
      responsavel: { select: { id: true, name: true, email: true } },
      subitens: { orderBy: { criadoEm: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export async function findOportunidadesParaDashboard() {
  return db.oportunidade.findMany({
    select: {
      id: true,
      cliente: true,
      produto: true,
      origemLead: true,
      valor: true,
      prazoFechamento: true,
      etapa: true,
      atividade: true,
      updatedAt: true,
      responsavel: { select: { id: true, name: true } },
    },
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

export async function addSubitem(oportunidadeId: string, texto: string) {
  return db.oportunidadeSubitem.create({ data: { oportunidadeId, texto } })
}

export async function toggleSubitem(id: string) {
  const item = await db.oportunidadeSubitem.findUnique({ where: { id } })
  if (!item) throw new Error("Subitem não encontrado")
  const feito = !item.feito
  return db.oportunidadeSubitem.update({
    where: { id },
    data: { feito, concluidoEm: feito ? new Date() : null },
  })
}

export async function deleteSubitem(id: string) {
  return db.oportunidadeSubitem.delete({ where: { id } })
}

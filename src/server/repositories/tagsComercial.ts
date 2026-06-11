import { db } from "@/server/db"

export async function findAllTagsComercial() {
  return db.tagComercial.findMany({ orderBy: { nome: "asc" } })
}

export async function createTagComercial(nome: string, cor: string) {
  return db.tagComercial.create({ data: { nome, cor } })
}

export async function deleteTagComercial(id: string) {
  return db.tagComercial.delete({ where: { id } })
}

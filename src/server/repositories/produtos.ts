import { db } from "@/server/db"

export async function findAllProdutos() {
  return db.produto.findMany({ orderBy: { nome: "asc" } })
}

export async function createProduto(nome: string) {
  return db.produto.create({ data: { nome } })
}

export async function deleteProduto(id: string) {
  return db.produto.delete({ where: { id } })
}

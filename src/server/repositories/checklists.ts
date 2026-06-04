import { db } from "@/server/db"

export async function findChecklistByCardId(cardId: string) {
  return db.checklistItem.findMany({
    where: { cardId },
    orderBy: { position: "asc" },
  })
}

export async function findChecklistItemById(id: string) {
  return db.checklistItem.findUnique({ where: { id } })
}

export async function createChecklistItem(data: {
  cardId: string
  text: string
  position: number
}) {
  return db.checklistItem.create({ data })
}

export async function updateChecklistItem(id: string, text: string) {
  return db.checklistItem.update({ where: { id }, data: { text } })
}

export async function updateChecklistItemDatas(
  id: string,
  data: { dataInicio?: Date | null; dataFim?: Date | null }
) {
  return db.checklistItem.update({ where: { id }, data })
}

export async function toggleChecklistItem(
  id: string,
  isDone: boolean,
  completedById?: string
) {
  return db.checklistItem.update({
    where: { id },
    data: {
      isDone,
      completedAt: isDone ? new Date() : null,
      completedById: isDone ? completedById : null,
    },
  })
}

export async function deleteChecklistItem(id: string) {
  return db.checklistItem.delete({ where: { id } })
}

export async function countChecklistItems(cardId: string) {
  return db.checklistItem.count({ where: { cardId } })
}

export async function reorderChecklistItems(
  items: { id: string; position: number }[]
) {
  await Promise.all(
    items.map((item) =>
      db.checklistItem.update({
        where: { id: item.id },
        data: { position: item.position },
      })
    )
  )
}

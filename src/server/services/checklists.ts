import {
  findChecklistItemById,
  createChecklistItem,
  updateChecklistItem as updateItemRecord,
  toggleChecklistItem,
  deleteChecklistItem,
  countChecklistItems,
  reorderChecklistItems,
} from "@/server/repositories/checklists"

export async function addChecklistItem(cardId: string, text: string) {
  const position = await countChecklistItems(cardId)
  return createChecklistItem({ cardId, text, position })
}

export async function editChecklistItem(itemId: string, text: string) {
  const item = await findChecklistItemById(itemId)
  if (!item) throw new Error("Item não encontrado")
  return updateItemRecord(itemId, text)
}

export async function toggleItem(itemId: string, isDone: boolean, completedById: string) {
  const item = await findChecklistItemById(itemId)
  if (!item) throw new Error("Item não encontrado")
  return toggleChecklistItem(itemId, isDone, completedById)
}

export async function removeChecklistItem(itemId: string) {
  const item = await findChecklistItemById(itemId)
  if (!item) throw new Error("Item não encontrado")
  return deleteChecklistItem(itemId)
}

export async function reorderItems(items: { id: string; position: number }[]) {
  return reorderChecklistItems(items)
}

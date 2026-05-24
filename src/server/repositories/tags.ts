import { db } from "@/server/db"

export async function findTagsByProjectId(projectId: string) {
  return db.tag.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  })
}

export async function createTag(data: { projectId: string; name: string; color: string }) {
  return db.tag.create({ data })
}

export async function deleteTag(id: string) {
  return db.tag.delete({ where: { id } })
}

export async function addTagToCard(cardId: string, tagId: string) {
  return db.cardTag.create({ data: { cardId, tagId } })
}

export async function removeTagFromCard(cardId: string, tagId: string) {
  return db.cardTag.delete({ where: { cardId_tagId: { cardId, tagId } } })
}

export async function setCardTags(cardId: string, tagIds: string[]) {
  await db.cardTag.deleteMany({ where: { cardId } })
  if (tagIds.length > 0) {
    await db.cardTag.createMany({
      data: tagIds.map((tagId) => ({ cardId, tagId })),
    })
  }
}

import { db } from "@/server/db"

export async function findMainActivitiesBySprintId(sprintId: string) {
  return db.mainActivity.findMany({
    where: { sprintId },
    select: { id: true, name: true, color: true },
    orderBy: { createdAt: "asc" },
  })
}

export async function createMainActivity(data: {
  sprintId: string
  name: string
  color: string
}) {
  return db.mainActivity.create({ data })
}

export async function deleteMainActivity(id: string) {
  return db.mainActivity.delete({ where: { id } })
}

import { db } from "@/server/db"

export async function findProjectBySlug(slug: string) {
  return db.project.findUnique({
    where: { slug },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, sprints: true, cards: true } },
    },
  })
}

export async function findProjectById(id: string) {
  return db.project.findUnique({
    where: { id },
  })
}

const PROJECT_LIST_INCLUDE = {
  _count: { select: { members: true, sprints: true, cards: true } },
  members: {
    where: { removedAt: null },
    take: 5,
    orderBy: { joinedAt: "asc" as const },
    include: { user: { select: { name: true } } },
  },
} as const

export async function findProjectsByMemberId(userId: string) {
  return db.project.findMany({
    where: {
      archivedAt: null,
      members: { some: { userId, removedAt: null } },
    },
    include: PROJECT_LIST_INCLUDE,
    orderBy: { updatedAt: "desc" },
  })
}

export async function findAllProjects() {
  return db.project.findMany({
    where: { archivedAt: null },
    include: PROJECT_LIST_INCLUDE,
    orderBy: { updatedAt: "desc" },
  })
}

export async function createProject(data: {
  name: string
  slug: string
  description?: string
  createdById: string
}) {
  return db.project.create({ data })
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string | null }
) {
  return db.project.update({ where: { id }, data })
}

export async function archiveProject(id: string) {
  return db.project.update({
    where: { id },
    data: { archivedAt: new Date() },
  })
}

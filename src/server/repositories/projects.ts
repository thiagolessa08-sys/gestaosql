import { db } from "@/server/db"
import type { CardStatus } from "@prisma/client"

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
  // Active sprint (at most 1)
  sprints: {
    where: { status: "ACTIVE" as const },
    take: 1,
    select: { name: true },
  },
  // Done cards for progress bar
  cards: {
    where: { status: "DONE" as const, archivedAt: null },
    select: { id: true },
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

export async function getProjectCardStats(projectId: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [total, done, thisWeek] = await Promise.all([
    db.card.count({ where: { projectId, archivedAt: null } }),
    db.card.count({ where: { projectId, archivedAt: null, status: "DONE" as CardStatus } }),
    db.card.count({ where: { projectId, archivedAt: null, createdAt: { gte: oneWeekAgo } } }),
  ])
  return { total, done, thisWeek }
}

export async function findRecentProjectsForSidebar(userId: string, isSystemAdmin: boolean) {
  return db.project.findMany({
    where: isSystemAdmin
      ? { archivedAt: null }
      : { archivedAt: null, members: { some: { userId, removedAt: null } } },
    select: { id: true, name: true, slug: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  })
}

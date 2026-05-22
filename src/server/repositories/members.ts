import { db } from "@/server/db"
import type { Role } from "@prisma/client"

export async function findMembersByProjectId(projectId: string) {
  return db.projectMember.findMany({
    where: { projectId, removedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" },
  })
}

export async function findMemberByUserAndProject(userId: string, projectId: string) {
  return db.projectMember.findFirst({
    where: { userId, projectId, removedAt: null },
  })
}

export async function createMember(data: {
  projectId: string
  userId: string
  role: Role
}) {
  return db.projectMember.create({ data })
}

export async function updateMemberRole(memberId: string, role: Role) {
  return db.projectMember.update({
    where: { id: memberId },
    data: { role },
  })
}

export async function removeMember(memberId: string) {
  return db.projectMember.update({
    where: { id: memberId },
    data: { removedAt: new Date() },
  })
}

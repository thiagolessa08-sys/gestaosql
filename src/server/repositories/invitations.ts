import { db } from "@/server/db"
import type { Role } from "@prisma/client"

export async function findInvitationByToken(token: string) {
  return db.projectInvitation.findUnique({
    where: { token },
    include: {
      project: { select: { id: true, name: true, slug: true } },
    },
  })
}

export async function createInvitation(data: {
  projectId: string
  email: string
  role: Role
  invitedById: string
  token: string
  expiresAt: Date
}) {
  return db.projectInvitation.create({ data })
}

export async function markInvitationAccepted(token: string) {
  return db.projectInvitation.update({
    where: { token },
    data: { acceptedAt: new Date() },
  })
}

export async function findPendingInvitationsByProject(projectId: string) {
  return db.projectInvitation.findMany({
    where: { projectId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })
}

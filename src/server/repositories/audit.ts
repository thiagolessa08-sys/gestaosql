import { db } from "@/server/db"
import type { AuditAction } from "@prisma/client"

export async function createAuditLog(data: {
  projectId: string
  actorId: string
  entityType: string
  entityId: string
  action: AuditAction
  changes?: unknown
}) {
  return db.auditLog.create({
    data: {
      projectId: data.projectId,
      actorId: data.actorId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      changes: data.changes as any,
    },
  })
}

export async function findAuditLogsByProject(projectId: string, limit = 50) {
  return db.auditLog.findMany({
    where: { projectId },
    include: {
      actor: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function findAuditLogsByProjectPaginated(
  projectId: string,
  opts: {
    entityType?: string
    actorId?: string
    limit?: number
    offset?: number
  } = {}
) {
  const { entityType, actorId, limit = 50, offset = 0 } = opts
  return db.auditLog.findMany({
    where: {
      projectId,
      ...(entityType ? { entityType } : {}),
      ...(actorId ? { actorId } : {}),
    },
    include: {
      actor: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  })
}

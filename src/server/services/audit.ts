import { db } from "@/server/db"
import type { AuditAction } from "@prisma/client"

export async function writeAudit(params: {
  projectId: string
  actorId: string
  entityType: string
  entityId: string
  action: AuditAction
  changes?: { before?: unknown; after?: unknown }
}) {
  await db.auditLog.create({
    data: {
      projectId: params.projectId,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changes: (params.changes ?? null) as any,
    },
  })
}

import { db } from "@/server/db"
import type { Role } from "@prisma/client"

export type ProjectAction =
  | "project:edit"
  | "project:archive"
  | "project:manage_members"
  | "project:manage_tags"
  | "project:view_audit"
  | "sprint:create"
  | "sprint:edit"
  | "sprint:start"
  | "sprint:close"
  | "card:create"
  | "card:edit"
  | "card:archive"
  | "card:move"
  | "card:assign_others"
  | "card:assign_self"
  | "comment:create"
  | "comment:delete_own"
  | "comment:delete_others"

export class ForbiddenError extends Error {
  constructor(action: ProjectAction) {
    super(`Forbidden: ação '${action}' não permitida para este papel`)
    this.name = "ForbiddenError"
  }
}

export class NotMemberError extends Error {
  constructor() {
    super("Usuário não é membro deste projeto")
    this.name = "NotMemberError"
  }
}

const PERMISSIONS: Record<Role, Set<ProjectAction>> = {
  ADMIN: new Set([
    "project:edit",
    "project:archive",
    "project:manage_members",
    "project:manage_tags",
    "project:view_audit",
    "sprint:create",
    "sprint:edit",
    "sprint:start",
    "sprint:close",
    "card:create",
    "card:edit",
    "card:archive",
    "card:move",
    "card:assign_others",
    "card:assign_self",
    "comment:create",
    "comment:delete_own",
    "comment:delete_others",
  ]),
  SCRUM_MASTER: new Set([
    "project:manage_tags",
    "project:view_audit",
    "sprint:create",
    "sprint:edit",
    "sprint:start",
    "sprint:close",
    "card:create",
    "card:edit",
    "card:archive",
    "card:move",
    "card:assign_others",
    "card:assign_self",
    "comment:create",
    "comment:delete_own",
    "comment:delete_others",
  ]),
  MEMBER: new Set([
    "card:create",
    "card:edit",
    "card:archive",
    "card:move",
    "card:assign_self",
    "comment:create",
    "comment:delete_own",
  ]),
}

export async function requirePermission(
  userId: string,
  projectId: string,
  action: ProjectAction,
): Promise<void> {
  const member = await db.projectMember.findFirst({
    where: { userId, projectId, removedAt: null },
  })

  if (!member) throw new NotMemberError()
  if (!PERMISSIONS[member.role]?.has(action)) throw new ForbiddenError(action)
}

export async function getMemberRole(
  userId: string,
  projectId: string,
): Promise<Role | null> {
  const member = await db.projectMember.findFirst({
    where: { userId, projectId, removedAt: null },
  })
  return member?.role ?? null
}

export async function isMember(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const member = await db.projectMember.findFirst({
    where: { userId, projectId, removedAt: null },
    select: { id: true },
  })
  return !!member
}

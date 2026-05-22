"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { inviteMemberSchema, updateRoleSchema } from "@/lib/schemas/members"
import { findProjectById } from "@/server/repositories/projects"
import { findMemberByUserAndProject, updateMemberRole, removeMember } from "@/server/repositories/members"
import { createInvitation } from "@/server/services/invitations"
import { requirePermission } from "@/server/permissions"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function inviteMemberAction(projectId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:manage_members")
  } catch {
    return { success: false, error: "Sem permissão para convidar membros." }
  }

  const raw = {
    email: formData.get("email"),
    role: formData.get("role"),
  }
  const parsed = inviteMemberSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const project = await findProjectById(projectId)
  if (!project) return { success: false, error: "Projeto não encontrado." }

  await createInvitation({
    projectId,
    projectName: project.name,
    email: parsed.data.email,
    role: parsed.data.role,
    invitedById: session.user.id,
    invitedByName: session.user.name ?? "Usuário",
  })

  revalidatePath(`/projetos/${project.slug}/pessoas`)
  return { success: true }
}

export async function updateMemberRoleAction(projectId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:manage_members")
  } catch {
    return { success: false, error: "Sem permissão para alterar papéis." }
  }

  const raw = {
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  }
  const parsed = updateRoleSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await updateMemberRole(parsed.data.memberId, parsed.data.role)
  revalidatePath(`/projetos`)
  return { success: true }
}

export async function removeMemberAction(projectId: string, memberId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:manage_members")
  } catch {
    return { success: false, error: "Sem permissão para remover membros." }
  }

  await removeMember(memberId)
  revalidatePath(`/projetos`)
  return { success: true }
}

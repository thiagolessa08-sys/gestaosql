"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { createProjectSchema, updateProjectSchema } from "@/lib/schemas/projects"
import { createProject, updateProject, archiveProject, unarchiveProject, deleteProjectCascade } from "@/server/services/projects"
import { requirePermission } from "@/server/permissions"
import { podeGerenciarProjeto } from "@/lib/acesso"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function createProjectAction(formData: FormData): Promise<ActionResult<{ slug: string }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!session.user.isSystemAdmin) return { success: false, error: "Apenas administradores do sistema podem criar projetos." }

  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  }
  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const project = await createProject({ ...parsed.data, createdById: session.user.id })
  revalidatePath("/projetos")
  return { success: true, data: { slug: project.slug } }
}

export async function updateProjectAction(projectId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar este projeto." }
  }

  const raw = {
    name: formData.get("name") || undefined,
    description: formData.get("description"),
  }
  const parsed = updateProjectSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await updateProject(projectId, parsed.data)
  revalidatePath("/projetos")
  return { success: true }
}

export async function archiveProjectAction(projectId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "project:archive")
  } catch {
    return { success: false, error: "Sem permissão para arquivar este projeto." }
  }

  await archiveProject(projectId)
  revalidatePath("/projetos")
  return { success: true }
}

export async function unarchiveProjectAction(projectId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!podeGerenciarProjeto(session.user)) return { success: false, error: "Sem permissão para restaurar projetos." }

  await unarchiveProject(projectId)
  revalidatePath("/projetos")
  return { success: true }
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!podeGerenciarProjeto(session.user)) return { success: false, error: "Sem permissão para apagar projetos." }

  try {
    await deleteProjectCascade(projectId)
  } catch {
    return { success: false, error: "Erro ao apagar o projeto." }
  }
  revalidatePath("/projetos")
  return { success: true }
}

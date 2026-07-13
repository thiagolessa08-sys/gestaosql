"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { createSprintSchema, updateSprintSchema, closeSprintSchema } from "@/lib/schemas/sprints"
import { createSprint, updateSprint, startSprint, closeSprint } from "@/server/services/sprints"
import { findSprintById } from "@/server/repositories/sprints"
import { requirePermission } from "@/server/permissions"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function createSprintAction(
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  try {
    await requirePermission(session.user.id, projectId, "sprint:create")
  } catch {
    return { success: false, error: "Sem permissão para criar sprints." }
  }

  const raw = {
    name: formData.get("name"),
    goal: formData.get("goal") || undefined,
    plannedStartDate: formData.get("plannedStartDate"),
    plannedEndDate: formData.get("plannedEndDate"),
  }
  const parsed = createSprintSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const sprint = await createSprint({ projectId, ...parsed.data })
  revalidatePath(`/projetos`)
  return { success: true, data: { id: sprint.id } }
}

export async function updateSprintAction(
  sprintId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  try {
    await requirePermission(session.user.id, sprint.projectId, "sprint:edit")
  } catch {
    return { success: false, error: "Sem permissão para editar esta sprint." }
  }

  const raw = {
    name: formData.get("name") || undefined,
    goal: formData.get("goal"),
    plannedStartDate: formData.get("plannedStartDate") || undefined,
    plannedEndDate: formData.get("plannedEndDate") || undefined,
  }
  const parsed = updateSprintSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await updateSprint(sprintId, parsed.data)
  revalidatePath(`/projetos`)
  return { success: true }
}

export async function startSprintAction(sprintId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  try {
    await requirePermission(session.user.id, sprint.projectId, "sprint:start")
  } catch {
    return { success: false, error: "Sem permissão para iniciar esta sprint." }
  }

  try {
    await startSprint(sprintId)
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao iniciar sprint." }
  }

  revalidatePath(`/projetos`)
  return { success: true }
}

export async function closeSprintAction(
  sprintId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  try {
    await requirePermission(session.user.id, sprint.projectId, "sprint:close")
  } catch {
    return { success: false, error: "Sem permissão para encerrar esta sprint." }
  }

  const raw = { destinationSprintId: formData.get("destinationSprintId") || undefined }
  const parsed = closeSprintSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const status = formData.get("acao") === "cancelar" ? "CANCELLED" : "COMPLETED"

  try {
    await closeSprint({ sprintId, destinationSprintId: parsed.data.destinationSprintId, status })
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao encerrar sprint." }
  }

  revalidatePath(`/projetos`)
  return { success: true }
}

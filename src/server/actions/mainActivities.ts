"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import {
  findMainActivitiesBySprintId,
  createMainActivity,
  deleteMainActivity,
} from "@/server/repositories/mainActivities"
import { findSprintById } from "@/server/repositories/sprints"
import { requirePermission } from "@/server/permissions"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

type ActivityItem = { id: string; name: string; color: string }

export async function getSprintMainActivitiesAction(
  sprintId: string
): Promise<ActionResult<ActivityItem[]>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  const activities = await findMainActivitiesBySprintId(sprintId)
  return { success: true, data: activities }
}

export async function createMainActivityAction(
  sprintId: string,
  formData: FormData
): Promise<ActionResult<ActivityItem>> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const sprint = await findSprintById(sprintId)
  if (!sprint) return { success: false, error: "Sprint não encontrada." }

  if (!session.user.isSystemAdmin) {
    try {
      await requirePermission(session.user.id, sprint.projectId, "sprint:edit")
    } catch {
      return { success: false, error: "Sem permissão para gerenciar atividades." }
    }
  }

  const name = (formData.get("name") as string | null)?.trim()
  const color = formData.get("color") as string | null

  if (!name) return { success: false, error: "Nome é obrigatório." }
  if (!color) return { success: false, error: "Cor é obrigatória." }

  const activity = await createMainActivity({ sprintId, name, color })
  revalidatePath("/", "layout")
  return { success: true, data: { id: activity.id, name: activity.name, color: activity.color } }
}

export async function deleteMainActivityAction(
  activityId: string,
  projectId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  if (!session.user.isSystemAdmin) {
    try {
      await requirePermission(session.user.id, projectId, "sprint:edit")
    } catch {
      return { success: false, error: "Sem permissão para excluir atividades." }
    }
  }

  await deleteMainActivity(activityId)
  revalidatePath("/", "layout")
  return { success: true }
}

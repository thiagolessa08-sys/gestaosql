"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { markNotificationRead, markAllNotificationsRead } from "@/server/repositories/notifications"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function markNotificationReadAction(notificationId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  await markNotificationRead(notificationId)
  revalidatePath("/")
  return { success: true }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  await markAllNotificationsRead(session.user.id)
  revalidatePath("/")
  return { success: true }
}

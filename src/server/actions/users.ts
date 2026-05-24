"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { db } from "@/server/db"
import { NotificationType } from "@prisma/client"
import { changePasswordSchema } from "@/lib/schemas/auth"
import { updateProfile, changePassword } from "@/server/services/users"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const name = (formData.get("name") as string | null)?.trim()
  if (!name) return { success: false, error: "Nome é obrigatório." }

  const avatarUrl = (formData.get("avatarUrl") as string | null)?.trim() || null

  try {
    await updateProfile({ userId: session.user.id, name, avatarUrl })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar perfil." }
  }

  revalidatePath("/configuracoes/perfil")
  return { success: true }
}

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const currentPassword = formData.get("currentPassword") as string | null
  if (!currentPassword) return { success: false, error: "Senha atual é obrigatória." }

  // changePasswordSchema validates newPassword (min 8) and confirm (must match)
  const raw = {
    newPassword: formData.get("newPassword"),
    confirm: formData.get("confirmPassword"),
  }

  const parsed = changePasswordSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    await changePassword({
      userId: session.user.id,
      currentPassword,
      newPassword: parsed.data.newPassword,
    })
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao trocar senha." }
  }

  revalidatePath("/")
  return { success: true }
}

export async function updateNotificationPreferenceAction(
  notificationType: string,
  emailEnabled: boolean
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const type = notificationType as NotificationType

  await db.userNotificationPreference.upsert({
    where: {
      userId_notificationType: {
        userId: session.user.id,
        notificationType: type,
      },
    },
    create: {
      userId: session.user.id,
      notificationType: type,
      emailEnabled,
    },
    update: { emailEnabled },
  })

  revalidatePath("/configuracoes/notificacoes")
  return { success: true }
}

"use server"

import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { db } from "@/server/db"
import { NotificationType } from "@prisma/client"
import { z } from "zod"
import { changePasswordSchema } from "@/lib/schemas/auth"
import { updateProfile, changePassword } from "@/server/services/users"
import { createUser, findAnyUserByEmail, reactivateUser, markUserDeleted, updateUserTipo, updateUser, adminResetPassword } from "@/server/repositories/users"
import type { PerfilAcesso } from "@prisma/client"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

type TipoUsuario = "ADMIN_TOTAL" | "ADMIN_PROJETO" | "ADMIN_COMERCIAL" | "MEMBRO_PROJETO" | "MEMBRO_COMERCIAL"

function mapTipo(tipo: TipoUsuario): { isSystemAdmin: boolean; perfil: PerfilAcesso } {
  if (tipo === "ADMIN_TOTAL") return { isSystemAdmin: true, perfil: "MEMBRO_PROJETO" }
  return { isSystemAdmin: false, perfil: tipo as PerfilAcesso }
}

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

const adminCreateUserSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  tipo: z.enum(["ADMIN_TOTAL", "ADMIN_PROJETO", "ADMIN_COMERCIAL", "MEMBRO_PROJETO", "MEMBRO_COMERCIAL"]).default("MEMBRO_PROJETO"),
})

export async function adminCreateUserAction(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!session.user.isSystemAdmin) return { success: false, error: "Apenas administradores podem criar usuários." }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    tipo: formData.get("tipo"),
  }

  const parsed = adminCreateUserSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    const { isSystemAdmin, perfil } = mapTipo(parsed.data.tipo)
    const existing = await findAnyUserByEmail(parsed.data.email)

    if (existing && existing.deletedAt === null) {
      return { success: false, error: "Já existe um usuário ativo com este email." }
    }

    if (existing && existing.deletedAt !== null) {
      // Email pertence a um usuário removido → reativa com os novos dados
      await reactivateUser(existing.id, {
        name: parsed.data.name,
        password: parsed.data.password,
        isSystemAdmin,
        perfil,
        mustChangePassword: true,
      })
    } else {
      await createUser({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        isSystemAdmin,
        perfil,
        mustChangePassword: true,
      })
    }

    revalidatePath("/configuracoes/usuarios")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar usuário." }
  }
}

export async function adminUpdateUserNameAction(
  userId: string,
  name: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!session.user.isSystemAdmin) return { success: false, error: "Apenas administradores podem editar usuários." }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: "Nome é obrigatório." }
  if (trimmed.length > 100) return { success: false, error: "Nome muito longo." }

  await updateUser(userId, { name: trimmed })
  revalidatePath("/configuracoes/usuarios")
  return { success: true }
}

export async function adminResetPasswordAction(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!session.user.isSystemAdmin) return { success: false, error: "Apenas administradores podem redefinir senhas." }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "A senha deve ter no mínimo 8 caracteres." }
  }

  try {
    await adminResetPassword(userId, newPassword)
    revalidatePath("/configuracoes/usuarios")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao redefinir senha." }
  }
}

export async function adminUpdateUserTipoAction(
  userId: string,
  tipo: TipoUsuario
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!session.user.isSystemAdmin) return { success: false, error: "Apenas administradores podem alterar usuários." }
  if (userId === session.user.id) return { success: false, error: "Você não pode alterar seu próprio tipo." }

  const { isSystemAdmin, perfil } = mapTipo(tipo)
  await updateUserTipo(userId, { isSystemAdmin, perfil })

  revalidatePath("/configuracoes/usuarios")
  return { success: true }
}

export async function adminDeleteUserAction(userId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }
  if (!session.user.isSystemAdmin) return { success: false, error: "Apenas administradores podem remover usuários." }
  if (userId === session.user.id) return { success: false, error: "Você não pode remover sua própria conta." }

  await markUserDeleted(userId)
  revalidatePath("/configuracoes/usuarios")
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

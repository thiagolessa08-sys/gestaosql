"use server"

import { randomBytes } from "crypto"
import { auth } from "@/server/auth/config"
import { revalidatePath } from "next/cache"
import { forgotPasswordSchema, resetPasswordSchema, acceptInviteSchema, changePasswordSchema } from "@/lib/schemas/auth"
import { findUserByEmail, updateUserPassword } from "@/server/repositories/users"
import { createPasswordResetToken, findPasswordResetToken, markPasswordResetTokenUsed } from "@/server/repositories/password-reset"
import { acceptInvitation } from "@/server/services/invitations"
import { sendEmail } from "@/server/email/send"
import { PasswordResetEmail } from "@/server/email/templates/password-reset"
import React from "react"

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string }

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const raw = { email: formData.get("email") }
  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: "Email inválido." }

  const user = await findUserByEmail(parsed.data.email)
  // Always return success to avoid email enumeration
  if (!user) return { success: true }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await createPasswordResetToken({ userId: user.id, token, expiresAt })

  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`

  await sendEmail({
    to: parsed.data.email,
    subject: "Redefinição de senha — SQLTech Gestão",
    template: React.createElement(PasswordResetEmail, {
      userName: user.name ?? parsed.data.email,
      resetUrl,
    }),
    recipientId: user.id,
  })

  return { success: true }
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const raw = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  }
  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  const record = await findPasswordResetToken(parsed.data.token)
  if (!record) return { success: false, error: "Link inválido ou expirado." }
  if (record.usedAt) return { success: false, error: "Este link já foi utilizado." }
  if (record.expiresAt < new Date()) return { success: false, error: "Link expirado." }

  await updateUserPassword(record.user.id, parsed.data.password)
  await markPasswordResetTokenUsed(parsed.data.token)

  return { success: true }
}

export async function acceptInvite(formData: FormData): Promise<ActionResult> {
  const raw = {
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  }
  const parsed = acceptInviteSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  try {
    await acceptInvitation({
      token: parsed.data.token,
      name: parsed.data.name,
      password: parsed.data.password,
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao aceitar convite." }
  }
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user.id) return { success: false, error: "Não autenticado." }

  const raw = {
    newPassword: formData.get("newPassword"),
    confirm: formData.get("confirm"),
  }
  const parsed = changePasswordSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." }

  await updateUserPassword(session.user.id, parsed.data.newPassword)
  revalidatePath("/")
  return { success: true }
}

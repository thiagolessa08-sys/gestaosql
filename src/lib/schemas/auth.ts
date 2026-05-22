import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  confirm: z.string().min(8, "Confirmação obrigatória"),
}).refine((data) => data.password === data.confirm, {
  message: "As senhas não coincidem",
  path: ["confirm"],
})

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token obrigatório"),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  confirm: z.string().min(8, "Confirmação obrigatória"),
}).refine((data) => data.password === data.confirm, {
  message: "As senhas não coincidem",
  path: ["confirm"],
})

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  confirm: z.string().min(8, "Confirmação obrigatória"),
}).refine((data) => data.newPassword === data.confirm, {
  message: "As senhas não coincidem",
  path: ["confirm"],
})

export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

import { z } from "zod"

const RoleEnum = z.enum(["ADMIN", "SCRUM_MASTER", "MEMBER"])

export const inviteMemberSchema = z.object({
  email: z.string().email("Email inválido"),
  role: RoleEnum,
})

export const updateRoleSchema = z.object({
  memberId: z.string().uuid("ID inválido"),
  role: RoleEnum,
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>

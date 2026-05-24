import bcrypt from "bcryptjs"
import {
  findUserByIdWithPassword,
  updateUser,
  updateUserPassword,
} from "@/server/repositories/users"

export async function updateProfile(input: {
  userId: string
  name: string
  avatarUrl: string | null
}) {
  const user = await findUserByIdWithPassword(input.userId)
  if (!user) throw new Error("Usuário não encontrado.")
  return updateUser(input.userId, { name: input.name, avatarUrl: input.avatarUrl })
}

export async function changePassword(input: {
  userId: string
  currentPassword: string
  newPassword: string
}) {
  const user = await findUserByIdWithPassword(input.userId)
  if (!user) throw new Error("Usuário não encontrado.")
  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash)
  if (!valid) throw new Error("Senha atual incorreta.")
  return updateUserPassword(input.userId, input.newPassword)
}

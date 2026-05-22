import { db } from "@/server/db"

export async function createPasswordResetToken(data: {
  userId: string
  token: string
  expiresAt: Date
}) {
  return db.passwordResetToken.create({ data })
}

export async function findPasswordResetToken(token: string) {
  return db.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true } } },
  })
}

export async function markPasswordResetTokenUsed(token: string) {
  return db.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })
}

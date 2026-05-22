import { randomBytes } from "crypto"
import type { Role } from "@prisma/client"
import {
  findInvitationByToken,
  createInvitation as createInvitationRecord,
  markInvitationAccepted,
} from "@/server/repositories/invitations"
import { findUserByEmail, createUser } from "@/server/repositories/users"
import { createMember, findMemberByUserAndProject } from "@/server/repositories/members"
import { sendEmail } from "@/server/email/send"
import { InviteEmail } from "@/server/email/templates/invite"
import React from "react"

interface CreateInvitationInput {
  projectId: string
  projectName: string
  email: string
  role: Role
  invitedById: string
  invitedByName: string
}

export async function createInvitation(input: CreateInvitationInput) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await createInvitationRecord({
    projectId: input.projectId,
    email: input.email,
    role: input.role,
    invitedById: input.invitedById,
    token,
    expiresAt,
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/convite?token=${token}`

  await sendEmail({
    to: input.email,
    subject: `Convite para o projeto ${input.projectName}`,
    template: React.createElement(InviteEmail, {
      invitedByName: input.invitedByName,
      projectName: input.projectName,
      role: input.role,
      inviteUrl,
    }),
    recipientId: input.invitedById,
  })

  return invitation
}

interface AcceptInvitationInput {
  token: string
  name: string
  password: string
}

export async function acceptInvitation(input: AcceptInvitationInput) {
  const invitation = await findInvitationByToken(input.token)

  if (!invitation) throw new Error("Convite inválido")
  if (invitation.acceptedAt) throw new Error("Convite já utilizado")
  if (invitation.expiresAt < new Date()) throw new Error("Convite expirado")

  let userId: string

  const existingUser = await findUserByEmail(invitation.email)

  if (existingUser) {
    userId = existingUser.id
    // Add as member if not already one
    const existingMember = await findMemberByUserAndProject(existingUser.id, invitation.projectId)
    if (!existingMember) {
      await createMember({ projectId: invitation.projectId, userId, role: invitation.role })
    }
  } else {
    const newUser = await createUser({
      name: input.name,
      email: invitation.email,
      password: input.password,
    })
    userId = newUser.id
    await createMember({ projectId: invitation.projectId, userId, role: invitation.role })
  }

  await markInvitationAccepted(input.token)

  return { userId }
}

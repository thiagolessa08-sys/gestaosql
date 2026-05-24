import React from "react"
import { createNotification, getEmailPreference } from "@/server/repositories/notifications"
import { sendEmail } from "@/server/email/send"
import { findUserById } from "@/server/repositories/users"
import { findMembersByProjectId } from "@/server/repositories/members"
import { CardAssignedEmail } from "@/server/email/templates/card-assigned"
import { CardCommentedEmail } from "@/server/email/templates/card-commented"
import { SprintStartedEmail } from "@/server/email/templates/sprint-started"
import { AddedToProjectEmail } from "@/server/email/templates/added-to-project"

function buildCardUrl(
  projectSlug: string,
  sprintId: string | null
): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  if (sprintId) {
    return `${base}/projetos/${projectSlug}/sprints/${sprintId}/board`
  }
  return `${base}/projetos/${projectSlug}/backlog`
}

// ─── notifyCardAssigned ──────────────────────────────────────────────────────

interface NotifyCardAssignedInput {
  assigneeId: string
  actorId: string
  cardId: string
  cardTitle: string
  projectId: string
  projectName: string
  projectSlug: string
  sprintId: string | null
}

export async function notifyCardAssigned(input: NotifyCardAssignedInput): Promise<void> {
  const { assigneeId, actorId, cardId, cardTitle, projectName, projectSlug, sprintId } = input

  if (assigneeId === actorId) return

  const user = await findUserById(assigneeId)
  if (!user) return

  const notification = await createNotification({
    recipientId: assigneeId,
    type: "CARD_ASSIGNED",
    title: "Card atribuído",
    body: `O card "${cardTitle}" foi atribuído a você.`,
    entityType: "card",
    entityId: cardId,
  })

  const emailEnabled = await getEmailPreference(assigneeId, "CARD_ASSIGNED")
  if (!emailEnabled) return

  const cardUrl = buildCardUrl(projectSlug, sprintId)

  await sendEmail({
    to: user.email,
    subject: `Card atribuído: ${cardTitle}`,
    template: React.createElement(CardAssignedEmail, {
      recipientName: user.name,
      cardTitle,
      projectName,
      cardUrl,
    }),
    recipientId: assigneeId,
    notificationId: notification.id,
  })
}

// ─── notifyComment ───────────────────────────────────────────────────────────

interface NotifyCommentInput {
  authorId: string
  authorName: string
  recipientId: string
  cardId: string
  cardTitle: string
  commentBody: string
  projectId: string
  projectSlug: string
  sprintId: string | null
}

export async function notifyComment(input: NotifyCommentInput): Promise<void> {
  const { authorId, authorName, recipientId, cardId, cardTitle, commentBody, projectSlug, sprintId } = input

  if (recipientId === authorId) return

  const user = await findUserById(recipientId)
  if (!user) return

  const notification = await createNotification({
    recipientId,
    type: "CARD_COMMENTED",
    title: "Novo comentário",
    body: `${authorName} comentou no card "${cardTitle}".`,
    entityType: "card",
    entityId: cardId,
  })

  const emailEnabled = await getEmailPreference(recipientId, "CARD_COMMENTED")
  if (!emailEnabled) return

  const cardUrl = buildCardUrl(projectSlug, sprintId)

  await sendEmail({
    to: user.email,
    subject: `Novo comentário em: ${cardTitle}`,
    template: React.createElement(CardCommentedEmail, {
      recipientName: user.name,
      authorName,
      cardTitle,
      commentBody,
      cardUrl,
    }),
    recipientId,
    notificationId: notification.id,
  })
}

// ─── notifyMentioned ─────────────────────────────────────────────────────────

interface NotifyMentionedInput {
  authorId: string
  authorName: string
  recipientId: string
  cardId: string
  cardTitle: string
  commentBody: string
  projectId: string
  projectSlug: string
  sprintId: string | null
}

export async function notifyMentioned(input: NotifyMentionedInput): Promise<void> {
  const { authorId, authorName, recipientId, cardId, cardTitle, commentBody, projectSlug, sprintId } = input

  if (recipientId === authorId) return

  const user = await findUserById(recipientId)
  if (!user) return

  const notification = await createNotification({
    recipientId,
    type: "MENTIONED",
    title: "Você foi mencionado",
    body: `${authorName} mencionou você no card "${cardTitle}".`,
    entityType: "card",
    entityId: cardId,
  })

  const emailEnabled = await getEmailPreference(recipientId, "MENTIONED")
  if (!emailEnabled) return

  const cardUrl = buildCardUrl(projectSlug, sprintId)

  await sendEmail({
    to: user.email,
    subject: `Você foi mencionado em: ${cardTitle}`,
    template: React.createElement(CardCommentedEmail, {
      recipientName: user.name,
      authorName,
      cardTitle,
      commentBody,
      cardUrl,
    }),
    recipientId,
    notificationId: notification.id,
  })
}

// ─── notifySprintStarted ─────────────────────────────────────────────────────

interface NotifySprintStartedInput {
  projectId: string
  projectName: string
  projectSlug: string
  sprintId: string
  sprintName: string
}

export async function notifySprintStarted(input: NotifySprintStartedInput): Promise<void> {
  const { projectId, projectName, projectSlug, sprintId, sprintName } = input

  const members = await findMembersByProjectId(projectId)

  await Promise.all(
    members.map(async (member) => {
      const notification = await createNotification({
        recipientId: member.userId,
        type: "SPRINT_STARTED",
        title: "Sprint iniciada",
        body: `A sprint "${sprintName}" do projeto "${projectName}" foi iniciada.`,
        entityType: "sprint",
        entityId: sprintId,
      })

      const emailEnabled = await getEmailPreference(member.userId, "SPRINT_STARTED")
      if (!emailEnabled) return

      const boardUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/projetos/${projectSlug}/sprints/${sprintId}/board`

      await sendEmail({
        to: member.user.email,
        subject: `Sprint iniciada: ${sprintName}`,
        template: React.createElement(SprintStartedEmail, {
          recipientName: member.user.name,
          sprintName,
          projectName,
          boardUrl,
        }),
        recipientId: member.userId,
        notificationId: notification.id,
      })
    })
  )
}

// ─── notifySprintEnded ───────────────────────────────────────────────────────

export async function notifySprintEnded(input: NotifySprintStartedInput): Promise<void> {
  const { projectId, projectName, projectSlug, sprintId, sprintName } = input

  const members = await findMembersByProjectId(projectId)

  await Promise.all(
    members.map(async (member) => {
      const notification = await createNotification({
        recipientId: member.userId,
        type: "SPRINT_ENDED",
        title: "Sprint encerrada",
        body: `A sprint "${sprintName}" do projeto "${projectName}" foi encerrada.`,
        entityType: "sprint",
        entityId: sprintId,
      })

      const emailEnabled = await getEmailPreference(member.userId, "SPRINT_ENDED")
      if (!emailEnabled) return

      const boardUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/projetos/${projectSlug}/sprints/${sprintId}/board`

      await sendEmail({
        to: member.user.email,
        subject: `Sprint encerrada: ${sprintName}`,
        template: React.createElement(SprintStartedEmail, {
          recipientName: member.user.name,
          sprintName,
          projectName,
          boardUrl,
        }),
        recipientId: member.userId,
        notificationId: notification.id,
      })
    })
  )
}

// ─── notifyAddedToProject ────────────────────────────────────────────────────

interface NotifyAddedToProjectInput {
  userId: string
  projectId: string
  projectName: string
  projectSlug: string
  role: string
}

export async function notifyAddedToProject(input: NotifyAddedToProjectInput): Promise<void> {
  const { userId, projectName, projectSlug, role } = input

  const user = await findUserById(userId)
  if (!user) return

  const projectUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/projetos/${projectSlug}`

  const notification = await createNotification({
    recipientId: userId,
    type: "ADDED_TO_PROJECT",
    title: "Adicionado ao projeto",
    body: `Você foi adicionado ao projeto "${projectName}" como ${role}.`,
    entityType: "project",
    entityId: input.projectId,
  })

  const emailEnabled = await getEmailPreference(userId, "ADDED_TO_PROJECT")
  if (!emailEnabled) return

  await sendEmail({
    to: user.email,
    subject: `Você foi adicionado ao projeto: ${projectName}`,
    template: React.createElement(AddedToProjectEmail, {
      recipientName: user.name,
      projectName,
      role,
      projectUrl,
    }),
    recipientId: userId,
    notificationId: notification.id,
  })
}

// ─── notifyRemovedFromProject ────────────────────────────────────────────────

interface NotifyRemovedFromProjectInput {
  userId: string
  projectName: string
}

export async function notifyRemovedFromProject(input: NotifyRemovedFromProjectInput): Promise<void> {
  const { userId, projectName } = input

  const user = await findUserById(userId)
  if (!user) return

  await createNotification({
    recipientId: userId,
    type: "REMOVED_FROM_PROJECT",
    title: "Removido do projeto",
    body: `Você foi removido do projeto "${projectName}".`,
  })
}

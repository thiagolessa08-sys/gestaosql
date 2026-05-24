import { describe, it, expect, vi, beforeEach } from "vitest"
import { notifyCardAssigned, notifyComment, notifyMentioned, notifySprintStarted, notifySprintEnded, notifyAddedToProject, notifyRemovedFromProject } from "@/server/services/notifications"

vi.mock("@/server/repositories/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
  getEmailPreference: vi.fn().mockResolvedValue(true),
}))
vi.mock("@/server/email/send", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/server/repositories/users", () => ({
  findUserById: vi.fn(),
}))
vi.mock("@/server/repositories/members", () => ({
  findMembersByProjectId: vi.fn(),
}))

// Import mocked functions
import { createNotification, getEmailPreference } from "@/server/repositories/notifications"
import { sendEmail } from "@/server/email/send"
import { findUserById } from "@/server/repositories/users"
import { findMembersByProjectId } from "@/server/repositories/members"

const mockUser = { id: "user-1", name: "Ana", email: "ana@test.com" }
const mockAssignee = { id: "user-2", name: "Bob", email: "bob@test.com" }

describe("notifyCardAssigned", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a notification for the assignee", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockAssignee as any)
    await notifyCardAssigned({
      assigneeId: "user-2",
      actorId: "user-1",
      cardId: "card-1",
      cardTitle: "Fix bug",
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      sprintId: "sprint-1",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "user-2",
        type: "CARD_ASSIGNED",
      })
    )
  })

  it("does not notify if assignee is the actor (self-assign)", async () => {
    await notifyCardAssigned({
      assigneeId: "user-1",
      actorId: "user-1",
      cardId: "card-1",
      cardTitle: "Fix bug",
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      sprintId: null,
    })
    expect(createNotification).not.toHaveBeenCalled()
  })

  it("sends email when emailEnabled is true", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockAssignee as any)
    vi.mocked(getEmailPreference).mockResolvedValue(true)
    await notifyCardAssigned({
      assigneeId: "user-2",
      actorId: "user-1",
      cardId: "card-1",
      cardTitle: "Fix bug",
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      sprintId: "sprint-1",
    })
    expect(sendEmail).toHaveBeenCalled()
  })

  it("skips email when emailEnabled is false", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockAssignee as any)
    vi.mocked(getEmailPreference).mockResolvedValue(false)
    await notifyCardAssigned({
      assigneeId: "user-2",
      actorId: "user-1",
      cardId: "card-1",
      cardTitle: "Fix bug",
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      sprintId: null,
    })
    expect(createNotification).toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe("notifyComment", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates notification for card assignee", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockUser as any)
    await notifyComment({
      authorId: "user-1",
      authorName: "Ana",
      recipientId: "user-2",
      cardId: "card-1",
      cardTitle: "Fix bug",
      commentBody: "Great work!",
      projectId: "proj-1",
      projectSlug: "my-project",
      sprintId: "sprint-1",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "user-2",
        type: "CARD_COMMENTED",
      })
    )
  })

  it("does not notify if recipient is the author", async () => {
    await notifyComment({
      authorId: "user-1",
      authorName: "Ana",
      recipientId: "user-1", // same as author
      cardId: "card-1",
      cardTitle: "Fix bug",
      commentBody: "Great work!",
      projectId: "proj-1",
      projectSlug: "my-project",
      sprintId: null,
    })
    expect(createNotification).not.toHaveBeenCalled()
  })
})

describe("notifySprintStarted", () => {
  beforeEach(() => vi.clearAllMocks())

  it("notifies all project members", async () => {
    vi.mocked(findMembersByProjectId).mockResolvedValue([
      { userId: "user-1", user: mockUser } as any,
      { userId: "user-2", user: mockAssignee } as any,
    ])
    vi.mocked(getEmailPreference).mockResolvedValue(false)
    await notifySprintStarted({
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      sprintId: "sprint-1",
      sprintName: "Sprint 1",
    })
    expect(createNotification).toHaveBeenCalledTimes(2)
  })
})

describe("notifyMentioned", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a MENTIONED notification for the recipient", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockUser as any)
    await notifyMentioned({
      authorId: "user-2",
      authorName: "Bob",
      recipientId: "user-1",
      cardId: "card-1",
      cardTitle: "Fix bug",
      commentBody: "Hey @Ana",
      projectId: "proj-1",
      projectSlug: "my-project",
      sprintId: null,
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-1", type: "MENTIONED" })
    )
  })

  it("does not notify if recipient is the author", async () => {
    await notifyMentioned({
      authorId: "user-1",
      authorName: "Ana",
      recipientId: "user-1",
      cardId: "card-1",
      cardTitle: "Fix bug",
      commentBody: "Hey @me",
      projectId: "proj-1",
      projectSlug: "my-project",
      sprintId: null,
    })
    expect(createNotification).not.toHaveBeenCalled()
  })
})

describe("notifySprintEnded", () => {
  beforeEach(() => vi.clearAllMocks())

  it("notifies all project members with SPRINT_ENDED type", async () => {
    vi.mocked(findMembersByProjectId).mockResolvedValue([
      { userId: "user-1", user: mockUser } as any,
      { userId: "user-2", user: mockAssignee } as any,
    ])
    vi.mocked(getEmailPreference).mockResolvedValue(false)
    await notifySprintEnded({
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      sprintId: "sprint-1",
      sprintName: "Sprint 1",
    })
    expect(createNotification).toHaveBeenCalledTimes(2)
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SPRINT_ENDED" })
    )
  })
})

describe("notifyAddedToProject", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates an ADDED_TO_PROJECT notification", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockUser as any)
    vi.mocked(getEmailPreference).mockResolvedValue(false)
    await notifyAddedToProject({
      userId: "user-1",
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      role: "MEMBER",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-1", type: "ADDED_TO_PROJECT" })
    )
  })

  it("sends email when emailEnabled is true", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockUser as any)
    vi.mocked(getEmailPreference).mockResolvedValue(true)
    await notifyAddedToProject({
      userId: "user-1",
      projectId: "proj-1",
      projectName: "My Project",
      projectSlug: "my-project",
      role: "MEMBER",
    })
    expect(sendEmail).toHaveBeenCalled()
  })
})

describe("notifyRemovedFromProject", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a REMOVED_FROM_PROJECT notification without sending email", async () => {
    vi.mocked(findUserById).mockResolvedValue(mockUser as any)
    await notifyRemovedFromProject({
      userId: "user-1",
      projectName: "My Project",
    })
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "user-1", type: "REMOVED_FROM_PROJECT" })
    )
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

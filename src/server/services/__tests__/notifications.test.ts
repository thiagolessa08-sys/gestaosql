import { describe, it, expect, vi, beforeEach } from "vitest"
import { notifyCardAssigned, notifyComment, notifySprintStarted } from "@/server/services/notifications"

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

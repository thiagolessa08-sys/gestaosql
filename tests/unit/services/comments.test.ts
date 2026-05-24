import { describe, it, expect, vi, beforeEach } from "vitest"
import { createComment, updateComment, deleteComment } from "@/server/services/comments"
import * as commentsRepo from "@/server/repositories/comments"
import * as cardsRepo from "@/server/repositories/cards"
import * as membersRepo from "@/server/repositories/members"
import * as auditService from "@/server/services/audit"

vi.mock("@/server/repositories/comments")
vi.mock("@/server/repositories/cards")
vi.mock("@/server/repositories/members")
vi.mock("@/server/services/audit")
vi.mock("@/server/db", () => ({ db: {} }))

const mockCard = {
  id: "card-1",
  projectId: "proj-1",
  sprintId: null,
  title: "Test card",
  description: null,
  assigneeId: null,
  priority: "MEDIUM" as const,
  status: "BACKLOG" as const,
  storyPoints: null,
  dueDate: null,
  position: 0,
  createdById: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
}

const mockComment = {
  id: "comment-1",
  cardId: "card-1",
  authorId: "user-1",
  body: "This is a comment",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

describe("createComment", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates comment and writes audit log", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ ...mockCard } as any)
    vi.mocked(commentsRepo.createComment).mockResolvedValue(mockComment)
    vi.mocked(auditService.writeAudit).mockResolvedValue(undefined)

    const result = await createComment({
      cardId: "card-1",
      authorId: "user-1",
      body: "This is a comment",
    })

    expect(commentsRepo.createComment).toHaveBeenCalledWith({
      cardId: "card-1",
      authorId: "user-1",
      body: "This is a comment",
    })
    expect(auditService.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "COMMENT" })
    )
    expect(result.body).toBe("This is a comment")
  })

  it("throws if card not found", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue(null)

    await expect(
      createComment({ cardId: "bad-id", authorId: "user-1", body: "text" })
    ).rejects.toThrow("Card não encontrado")
  })
})

describe("updateComment", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows author to update their own comment", async () => {
    vi.mocked(commentsRepo.findCommentById).mockResolvedValue(mockComment)
    vi.mocked(commentsRepo.updateComment).mockResolvedValue({ ...mockComment, body: "Updated" })

    const result = await updateComment({
      commentId: "comment-1",
      authorId: "user-1",
      body: "Updated",
    })

    expect(commentsRepo.updateComment).toHaveBeenCalledWith("comment-1", "Updated")
    expect(result.body).toBe("Updated")
  })

  it("throws if user is not the author", async () => {
    vi.mocked(commentsRepo.findCommentById).mockResolvedValue(mockComment)

    await expect(
      updateComment({ commentId: "comment-1", authorId: "user-2", body: "Hacked" })
    ).rejects.toThrow("Sem permissão para editar este comentário")
  })
})

describe("deleteComment", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows author to delete their own comment", async () => {
    vi.mocked(commentsRepo.findCommentById).mockResolvedValue(mockComment)
    vi.mocked(membersRepo.findMemberByUserAndProject).mockResolvedValue({
      id: "mem-1", userId: "user-1", projectId: "proj-1", role: "MEMBER",
      joinedAt: new Date(), removedAt: null,
    })
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ ...mockCard } as any)
    vi.mocked(commentsRepo.softDeleteComment).mockResolvedValue({ ...mockComment, deletedAt: new Date() })

    await deleteComment({ commentId: "comment-1", actorId: "user-1", projectId: "proj-1" })

    expect(commentsRepo.softDeleteComment).toHaveBeenCalledWith("comment-1")
  })

  it("allows ADMIN to delete any comment", async () => {
    vi.mocked(commentsRepo.findCommentById).mockResolvedValue(mockComment)
    vi.mocked(membersRepo.findMemberByUserAndProject).mockResolvedValue({
      id: "mem-2", userId: "admin-1", projectId: "proj-1", role: "ADMIN",
      joinedAt: new Date(), removedAt: null,
    })
    vi.mocked(commentsRepo.softDeleteComment).mockResolvedValue({ ...mockComment, deletedAt: new Date() })

    await deleteComment({ commentId: "comment-1", actorId: "admin-1", projectId: "proj-1" })

    expect(commentsRepo.softDeleteComment).toHaveBeenCalledWith("comment-1")
  })

  it("throws if MEMBER tries to delete another user's comment", async () => {
    vi.mocked(commentsRepo.findCommentById).mockResolvedValue(mockComment) // authorId: "user-1"
    vi.mocked(membersRepo.findMemberByUserAndProject).mockResolvedValue({
      id: "mem-3", userId: "user-2", projectId: "proj-1", role: "MEMBER",
      joinedAt: new Date(), removedAt: null,
    })

    await expect(
      deleteComment({ commentId: "comment-1", actorId: "user-2", projectId: "proj-1" })
    ).rejects.toThrow("Sem permissão para excluir este comentário")
  })

  it("soft deletes — comment still exists but deletedAt is set", async () => {
    vi.mocked(commentsRepo.findCommentById).mockResolvedValue(mockComment)
    vi.mocked(membersRepo.findMemberByUserAndProject).mockResolvedValue({
      id: "mem-1", userId: "user-1", projectId: "proj-1", role: "MEMBER",
      joinedAt: new Date(), removedAt: null,
    })
    const deleted = { ...mockComment, deletedAt: new Date() }
    vi.mocked(commentsRepo.softDeleteComment).mockResolvedValue(deleted)

    const result = await deleteComment({ commentId: "comment-1", actorId: "user-1", projectId: "proj-1" })

    expect(result.deletedAt).not.toBeNull()
    expect(result.id).toBe("comment-1") // still exists
  })
})

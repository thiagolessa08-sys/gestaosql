import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))
vi.mock("@/server/repositories/comments", () => ({
  findCommentById: vi.fn(),
}))
vi.mock("@/server/repositories/cards", () => ({
  findCardById: vi.fn(),
}))
vi.mock("@/server/services/comments", () => ({
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}))
vi.mock("@/server/permissions", () => ({
  requirePermission: vi.fn(),
}))

import { auth } from "@/server/auth/config"
import { findCommentById } from "@/server/repositories/comments"
import { findCardById } from "@/server/repositories/cards"
import { createComment, updateComment, deleteComment } from "@/server/services/comments"
import { requirePermission } from "@/server/permissions"
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from "@/server/actions/comments"

const mockAuth = vi.mocked(auth)
const mockFindCommentById = vi.mocked(findCommentById)
const mockFindCardById = vi.mocked(findCardById)
const mockCreateComment = vi.mocked(createComment)
const mockUpdateComment = vi.mocked(updateComment)
const mockDeleteComment = vi.mocked(deleteComment)
const mockRequirePermission = vi.mocked(requirePermission)

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const SESSION = { user: { id: "user-1" } }
const CARD = { id: "card-1", projectId: "proj-1" }
const COMMENT = { id: "comment-1", cardId: "card-1", authorId: "user-1", body: "hello" }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// createCommentAction
// ---------------------------------------------------------------------------
describe("createCommentAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await createCommentAction("card-1", makeFormData({ content: "hi" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns error when card not found", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(null)
    const result = await createCommentAction("card-1", makeFormData({ content: "hi" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/card/i)
  })

  it("returns error when permission denied", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))
    const result = await createCommentAction("card-1", makeFormData({ content: "hi" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/permissão/i)
  })

  it("returns error when content is empty", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    const result = await createCommentAction("card-1", makeFormData({ content: "" }))
    expect(result.success).toBe(false)
  })

  it("returns success with comment id on happy path", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockCreateComment.mockResolvedValue({ id: "comment-1" } as any)
    const result = await createCommentAction("card-1", makeFormData({ content: "Nice work!" }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ id: "comment-1" })
    expect(mockCreateComment).toHaveBeenCalledWith({
      cardId: "card-1",
      authorId: "user-1",
      body: "Nice work!",
    })
  })
})

// ---------------------------------------------------------------------------
// updateCommentAction
// ---------------------------------------------------------------------------
describe("updateCommentAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await updateCommentAction("comment-1", makeFormData({ content: "updated" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns error when comment not found", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCommentById.mockResolvedValue(null)
    const result = await updateCommentAction("comment-1", makeFormData({ content: "updated" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/coment/i)
  })

  it("returns error when editor is not the author", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other-user" } } as any)
    mockFindCommentById.mockResolvedValue({ ...COMMENT, authorId: "user-1" } as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    const result = await updateCommentAction("comment-1", makeFormData({ content: "hacked" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autor/i)
  })

  it("returns success on happy path", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCommentById.mockResolvedValue(COMMENT as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockUpdateComment.mockResolvedValue(COMMENT as any)
    const result = await updateCommentAction("comment-1", makeFormData({ content: "updated text" }))
    expect(result.success).toBe(true)
    expect(mockUpdateComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      authorId: "user-1",
      body: "updated text",
    })
  })
})

// ---------------------------------------------------------------------------
// deleteCommentAction
// ---------------------------------------------------------------------------
describe("deleteCommentAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await deleteCommentAction("comment-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns error when comment not found", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCommentById.mockResolvedValue(null)
    const result = await deleteCommentAction("comment-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/coment/i)
  })

  it("returns error when service throws (no permission)", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCommentById.mockResolvedValue(COMMENT as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockDeleteComment.mockRejectedValue(new Error("Sem permissão para excluir este comentário"))
    const result = await deleteCommentAction("comment-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/permissão/i)
  })

  it("returns success on happy path — service handles permission", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCommentById.mockResolvedValue(COMMENT as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockDeleteComment.mockResolvedValue(undefined as any)
    const result = await deleteCommentAction("comment-1")
    expect(result.success).toBe(true)
    expect(mockDeleteComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      actorId: "user-1",
      projectId: "proj-1",
    })
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/server/auth/config", () => ({
  auth: vi.fn(),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))
vi.mock("@/server/repositories/checklists", () => ({
  findChecklistItemById: vi.fn(),
  countChecklistItems: vi.fn(),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  toggleChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  reorderChecklistItems: vi.fn(),
}))
vi.mock("@/server/repositories/cards", () => ({
  findCardById: vi.fn(),
}))
vi.mock("@/server/permissions", () => ({
  requirePermission: vi.fn(),
}))

import { auth } from "@/server/auth/config"
import {
  findChecklistItemById,
  countChecklistItems,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from "@/server/repositories/checklists"
import { findCardById } from "@/server/repositories/cards"
import { requirePermission } from "@/server/permissions"
import {
  createChecklistItemAction,
  toggleChecklistItemAction,
  updateChecklistItemAction,
  deleteChecklistItemAction,
  reorderChecklistItemsAction,
} from "@/server/actions/checklists"

const mockAuth = vi.mocked(auth)
const mockFindChecklistItemById = vi.mocked(findChecklistItemById)
const mockCountChecklistItems = vi.mocked(countChecklistItems)
const mockCreateChecklistItem = vi.mocked(createChecklistItem)
const mockToggleChecklistItem = vi.mocked(toggleChecklistItem)
const mockDeleteChecklistItem = vi.mocked(deleteChecklistItem)
const mockReorderChecklistItems = vi.mocked(reorderChecklistItems)
const mockFindCardById = vi.mocked(findCardById)
const mockRequirePermission = vi.mocked(requirePermission)

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return fd
}

const SESSION = { user: { id: "user-1" } }
const CARD = { id: "card-1", projectId: "proj-1" }
const ITEM_PENDING = { id: "item-1", cardId: "card-1", text: "Do something", isDone: false, completedAt: null, completedById: null }
const ITEM_DONE = { id: "item-1", cardId: "card-1", text: "Do something", isDone: true, completedAt: new Date("2026-01-01"), completedById: "user-1" }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequirePermission.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// createChecklistItemAction
// ---------------------------------------------------------------------------
describe("createChecklistItemAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await createChecklistItemAction("card-1", makeFormData({ text: "task" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns error when card not found", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(null)
    const result = await createChecklistItemAction("card-1", makeFormData({ text: "task" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/card/i)
  })

  it("returns error when permission denied", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))
    const result = await createChecklistItemAction("card-1", makeFormData({ text: "task" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/permissão/i)
  })

  it("returns error when text is empty", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    const result = await createChecklistItemAction("card-1", makeFormData({ text: "" }))
    expect(result.success).toBe(false)
  })

  it("returns success with item id on happy path", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockCountChecklistItems.mockResolvedValue(3)
    mockCreateChecklistItem.mockResolvedValue({ id: "item-1" } as any)

    const result = await createChecklistItemAction("card-1", makeFormData({ text: "New task" }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual({ id: "item-1" })
    expect(mockCreateChecklistItem).toHaveBeenCalledWith({ cardId: "card-1", text: "New task", position: 3 })
  })
})

// ---------------------------------------------------------------------------
// toggleChecklistItemAction
// ---------------------------------------------------------------------------
describe("toggleChecklistItemAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await toggleChecklistItemAction("item-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns error when item not found", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindChecklistItemById.mockResolvedValue(null)
    const result = await toggleChecklistItemAction("item-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/item/i)
  })

  it("marks uncompleted item as done (sets isDone=true)", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindChecklistItemById.mockResolvedValue(ITEM_PENDING as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockToggleChecklistItem.mockResolvedValue(undefined as any)

    const result = await toggleChecklistItemAction("item-1")
    expect(result.success).toBe(true)
    expect(mockToggleChecklistItem).toHaveBeenCalledWith("item-1", true, "user-1")
  })

  it("marks completed item as undone (clears isDone)", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindChecklistItemById.mockResolvedValue(ITEM_DONE as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockToggleChecklistItem.mockResolvedValue(undefined as any)

    const result = await toggleChecklistItemAction("item-1")
    expect(result.success).toBe(true)
    expect(mockToggleChecklistItem).toHaveBeenCalledWith("item-1", false, undefined)
  })
})

// ---------------------------------------------------------------------------
// updateChecklistItemAction
// ---------------------------------------------------------------------------
describe("updateChecklistItemAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await updateChecklistItemAction("item-1", makeFormData({ text: "updated" }))
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns success on happy path", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindChecklistItemById.mockResolvedValue(ITEM_PENDING as any)
    mockFindCardById.mockResolvedValue(CARD as any)

    const result = await updateChecklistItemAction("item-1", makeFormData({ text: "updated text" }))
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// deleteChecklistItemAction
// ---------------------------------------------------------------------------
describe("deleteChecklistItemAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await deleteChecklistItemAction("item-1")
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("returns success on happy path", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindChecklistItemById.mockResolvedValue(ITEM_PENDING as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockDeleteChecklistItem.mockResolvedValue(undefined as any)

    const result = await deleteChecklistItemAction("item-1")
    expect(result.success).toBe(true)
    expect(mockDeleteChecklistItem).toHaveBeenCalledWith("item-1")
  })
})

// ---------------------------------------------------------------------------
// reorderChecklistItemsAction
// ---------------------------------------------------------------------------
describe("reorderChecklistItemsAction", () => {
  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any)
    const result = await reorderChecklistItemsAction("card-1", ["item-2", "item-1"])
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/autenticado/i)
  })

  it("reorders items with correct positions on happy path", async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockFindCardById.mockResolvedValue(CARD as any)
    mockReorderChecklistItems.mockResolvedValue(undefined as any)

    const result = await reorderChecklistItemsAction("card-1", ["item-2", "item-1", "item-3"])
    expect(result.success).toBe(true)
    expect(mockReorderChecklistItems).toHaveBeenCalledWith([
      { id: "item-2", position: 0 },
      { id: "item-1", position: 1 },
      { id: "item-3", position: 2 },
    ])
  })
})

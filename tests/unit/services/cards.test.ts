import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCard, updateCard, archiveCard, moveCard } from "@/server/services/cards"
import * as cardsRepo from "@/server/repositories/cards"
import * as auditService from "@/server/services/audit"
import { db } from "@/server/db"

vi.mock("@/server/repositories/cards")
vi.mock("@/server/services/audit")
vi.mock("@/server/db", () => ({
  db: {
    card: { findMany: vi.fn(), update: vi.fn() },
    cardStatusTransition: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockCard = {
  id: "card-1",
  projectId: "proj-1",
  sprintId: "sprint-1",
  title: "Fix bug",
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
  mainActivityId: null, dataInicio: null,
}

describe("createCard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a card with status BACKLOG and next position", async () => {
    vi.mocked(cardsRepo.countCardsByStatus).mockResolvedValue(3)
    vi.mocked(cardsRepo.createCard).mockResolvedValue(mockCard)
    vi.mocked(auditService.writeAudit).mockResolvedValue(undefined)

    const result = await createCard({
      projectId: "proj-1",
      title: "Fix bug",
      priority: "MEDIUM",
      createdById: "user-1",
    })

    expect(cardsRepo.createCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Fix bug",
        priority: "MEDIUM",
        position: 3, // next after existing 3 cards
      })
    )
    expect(result.title).toBe("Fix bug")
  })
})

describe("archiveCard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("archives card with soft delete", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ ...mockCard } as any)
    vi.mocked(cardsRepo.archiveCard).mockResolvedValue({ ...mockCard, archivedAt: new Date() })
    vi.mocked(auditService.writeAudit).mockResolvedValue(undefined)

    const result = await archiveCard({ cardId: "card-1", actorId: "user-1" })

    expect(cardsRepo.archiveCard).toHaveBeenCalledWith("card-1")
    expect(result.archivedAt).not.toBeNull()
  })

  it("throws if card not found", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue(null)

    await expect(
      archiveCard({ cardId: "bad-id", actorId: "user-1" })
    ).rejects.toThrow("Card não encontrado")
  })
})

describe("moveCard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("moves card to a new status and logs audit", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue({ ...mockCard } as any)
    vi.mocked(cardsRepo.countCardsByStatus).mockResolvedValue(0)
    vi.mocked(cardsRepo.updateCardStatus).mockResolvedValue({ ...mockCard, status: "DOING" as const })
    vi.mocked(db.cardStatusTransition.create).mockResolvedValue({} as any)
    vi.mocked(auditService.writeAudit).mockResolvedValue(undefined)

    await moveCard({
      cardId: "card-1",
      toStatus: "DOING",
      actorId: "user-1",
    })

    expect(cardsRepo.updateCardStatus).toHaveBeenCalledWith("card-1", "DOING", 0)
    expect(db.cardStatusTransition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cardId: "card-1",
          fromStatus: "BACKLOG",
          toStatus: "DOING",
          movedById: "user-1",
        }),
      })
    )
    expect(auditService.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MOVE" })
    )
  })

  it("throws if card not found", async () => {
    vi.mocked(cardsRepo.findCardById).mockResolvedValue(null)

    await expect(
      moveCard({ cardId: "bad-id", toStatus: "DOING", actorId: "user-1" })
    ).rejects.toThrow("Card não encontrado")
  })
})

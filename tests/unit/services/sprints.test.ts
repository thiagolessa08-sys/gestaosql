import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createSprint,
  updateSprint,
  startSprint,
  closeSprint,
} from "@/server/services/sprints"
import * as sprintsRepo from "@/server/repositories/sprints"
import { db } from "@/server/db"

vi.mock("@/server/repositories/sprints")
vi.mock("@/server/db", () => ({
  db: {
    card: { updateMany: vi.fn() },
  },
}))

const mockSprint = {
  id: "sprint-1",
  projectId: "proj-1",
  name: "Sprint 1",
  goal: null,
  plannedStartDate: new Date("2026-01-01"),
  plannedEndDate: new Date("2026-01-14"),
  startedAt: null,
  endedAt: null,
  status: "PLANNED" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockActiveSprint = { ...mockSprint, status: "ACTIVE" as const, startedAt: new Date() }

describe("createSprint", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a sprint", async () => {
    vi.mocked(sprintsRepo.createSprint).mockResolvedValue(mockSprint)

    const result = await createSprint({
      projectId: "proj-1",
      name: "Sprint 1",
      plannedStartDate: new Date("2026-01-01"),
      plannedEndDate: new Date("2026-01-14"),
    })

    expect(sprintsRepo.createSprint).toHaveBeenCalledOnce()
    expect(result.name).toBe("Sprint 1")
  })
})

describe("startSprint", () => {
  beforeEach(() => vi.clearAllMocks())

  it("starts a PLANNED sprint", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(mockSprint)
    vi.mocked(sprintsRepo.findActiveSprintByProjectId).mockResolvedValue(null)
    vi.mocked(sprintsRepo.startSprint).mockResolvedValue(mockActiveSprint)

    const result = await startSprint("sprint-1")

    expect(sprintsRepo.startSprint).toHaveBeenCalledWith("sprint-1")
    expect(result.status).toBe("ACTIVE")
  })

  it("throws if sprint not found", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(null)

    await expect(startSprint("bad-id")).rejects.toThrow("Sprint não encontrada")
  })

  it("throws if sprint is not PLANNED", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(mockActiveSprint)

    await expect(startSprint("sprint-1")).rejects.toThrow("Apenas sprints PLANNED podem ser iniciadas")
  })

  it("throws if there is already an active sprint in the project", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(mockSprint)
    vi.mocked(sprintsRepo.findActiveSprintByProjectId).mockResolvedValue(mockActiveSprint)

    await expect(startSprint("sprint-1")).rejects.toThrow("Já existe uma sprint ativa neste projeto")
  })
})

describe("closeSprint", () => {
  beforeEach(() => vi.clearAllMocks())

  it("closes an active sprint and moves non-DONE cards to backlog", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(mockActiveSprint)
    vi.mocked(sprintsRepo.closeSprint).mockResolvedValue({
      ...mockActiveSprint,
      status: "COMPLETED" as const,
      endedAt: new Date(),
    })
    vi.mocked(db.card.updateMany).mockResolvedValue({ count: 2 })

    await closeSprint({ sprintId: "sprint-1" })

    expect(db.card.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sprintId: "sprint-1" }),
        data: expect.objectContaining({ sprintId: null }),
      })
    )
    expect(sprintsRepo.closeSprint).toHaveBeenCalledWith("sprint-1")
  })

  it("moves non-DONE cards to destination sprint when provided", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(mockActiveSprint)
    vi.mocked(sprintsRepo.closeSprint).mockResolvedValue({
      ...mockActiveSprint,
      status: "COMPLETED" as const,
      endedAt: new Date(),
    })
    vi.mocked(db.card.updateMany).mockResolvedValue({ count: 1 })

    await closeSprint({ sprintId: "sprint-1", destinationSprintId: "sprint-2" })

    expect(db.card.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sprintId: "sprint-2" }),
      })
    )
  })

  it("throws if sprint not found", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(null)

    await expect(closeSprint({ sprintId: "bad-id" })).rejects.toThrow("Sprint não encontrada")
  })

  it("throws if sprint is not ACTIVE", async () => {
    vi.mocked(sprintsRepo.findSprintById).mockResolvedValue(mockSprint) // PLANNED

    await expect(closeSprint({ sprintId: "sprint-1" })).rejects.toThrow("Apenas sprints ACTIVE podem ser encerradas")
  })
})

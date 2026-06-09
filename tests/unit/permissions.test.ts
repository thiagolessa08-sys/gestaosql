import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest"
import { requirePermission, getMemberRole, isMember, ForbiddenError, NotMemberError } from "@/server/permissions"
import { db } from "@/server/db"

vi.mock("@/server/db", () => ({
  db: {
    projectMember: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const mockFindFirst = db.projectMember.findFirst as unknown as MockInstance
const mockUserFind = db.user.findUnique as unknown as MockInstance

function mockMember(role: "ADMIN" | "SCRUM_MASTER" | "MEMBER") {
  return {
    id: "m1",
    projectId: "p1",
    userId: "u1",
    role,
    joinedAt: new Date(),
    removedAt: null,
  }
}

describe("requirePermission", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lança NotMemberError quando usuário não é membro", async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(requirePermission("u1", "p1", "card:create")).rejects.toThrow(NotMemberError)
  })

  it("MEMBER pode criar card", async () => {
    mockFindFirst.mockResolvedValue(mockMember("MEMBER"))
    await expect(requirePermission("u1", "p1", "card:create")).resolves.not.toThrow()
  })

  it("MEMBER pode mover card", async () => {
    mockFindFirst.mockResolvedValue(mockMember("MEMBER"))
    await expect(requirePermission("u1", "p1", "card:move")).resolves.not.toThrow()
  })

  it("MEMBER não pode editar projeto", async () => {
    mockFindFirst.mockResolvedValue(mockMember("MEMBER"))
    await expect(requirePermission("u1", "p1", "project:edit")).rejects.toThrow(ForbiddenError)
  })

  it("MEMBER não pode criar sprint", async () => {
    mockFindFirst.mockResolvedValue(mockMember("MEMBER"))
    await expect(requirePermission("u1", "p1", "sprint:create")).rejects.toThrow(ForbiddenError)
  })

  it("MEMBER não pode deletar comentário de outro", async () => {
    mockFindFirst.mockResolvedValue(mockMember("MEMBER"))
    await expect(requirePermission("u1", "p1", "comment:delete_others")).rejects.toThrow(ForbiddenError)
  })

  it("SCRUM_MASTER pode criar sprint", async () => {
    mockFindFirst.mockResolvedValue(mockMember("SCRUM_MASTER"))
    await expect(requirePermission("u1", "p1", "sprint:create")).resolves.not.toThrow()
  })

  it("SCRUM_MASTER pode encerrar sprint", async () => {
    mockFindFirst.mockResolvedValue(mockMember("SCRUM_MASTER"))
    await expect(requirePermission("u1", "p1", "sprint:close")).resolves.not.toThrow()
  })

  it("SCRUM_MASTER não pode gerenciar membros", async () => {
    mockFindFirst.mockResolvedValue(mockMember("SCRUM_MASTER"))
    await expect(requirePermission("u1", "p1", "project:manage_members")).rejects.toThrow(ForbiddenError)
  })

  it("SCRUM_MASTER pode deletar comentário de outro", async () => {
    mockFindFirst.mockResolvedValue(mockMember("SCRUM_MASTER"))
    await expect(requirePermission("u1", "p1", "comment:delete_others")).resolves.not.toThrow()
  })

  it("ADMIN pode fazer tudo", async () => {
    mockFindFirst.mockResolvedValue(mockMember("ADMIN"))
    await expect(requirePermission("u1", "p1", "project:manage_members")).resolves.not.toThrow()
    await expect(requirePermission("u1", "p1", "project:archive")).resolves.not.toThrow()
    await expect(requirePermission("u1", "p1", "sprint:start")).resolves.not.toThrow()
  })

  it("consulta banco sem removedAt", async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(requirePermission("u1", "p1", "card:move")).rejects.toThrow(NotMemberError)
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { userId: "u1", projectId: "p1", removedAt: null },
    })
  })
})

describe("getMemberRole", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna o role quando é membro", async () => {
    mockFindFirst.mockResolvedValue(mockMember("SCRUM_MASTER"))
    const role = await getMemberRole("u1", "p1")
    expect(role).toBe("SCRUM_MASTER")
  })

  it("retorna null quando não é membro", async () => {
    mockFindFirst.mockResolvedValue(null)
    const role = await getMemberRole("u1", "p1")
    expect(role).toBeNull()
  })
})

describe("isMember", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna true quando é membro", async () => {
    mockFindFirst.mockResolvedValue(mockMember("MEMBER"))
    expect(await isMember("u1", "p1")).toBe(true)
  })

  it("retorna false quando não é membro", async () => {
    mockFindFirst.mockResolvedValue(null)
    expect(await isMember("u1", "p1")).toBe(false)
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createProject,
  updateProject,
  archiveProject,
  getProjectsForUser,
} from "@/server/services/projects"
import * as projectsRepo from "@/server/repositories/projects"
import * as membersRepo from "@/server/repositories/members"

vi.mock("@/server/repositories/projects")
vi.mock("@/server/repositories/members")
vi.mock("@/server/db", () => ({ db: {} }))

const mockProject = {
  id: "proj-1",
  name: "Meu Projeto",
  slug: "meu-projeto",
  description: null,
  createdById: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  archivedAt: null,
}

describe("createProject", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates project and adds creator as ADMIN member", async () => {
    vi.mocked(projectsRepo.findProjectBySlug).mockResolvedValue(null)
    vi.mocked(projectsRepo.createProject).mockResolvedValue(mockProject)
    vi.mocked(membersRepo.createMember).mockResolvedValue({
      id: "mem-1",
      projectId: "proj-1",
      userId: "user-1",
      role: "ADMIN",
      joinedAt: new Date(),
      removedAt: null,
    })

    const result = await createProject({ name: "Meu Projeto", createdById: "user-1" })

    expect(projectsRepo.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Meu Projeto", slug: "meu-projeto", createdById: "user-1" })
    )
    expect(membersRepo.createMember).toHaveBeenCalledWith({
      projectId: "proj-1",
      userId: "user-1",
      role: "ADMIN",
    })
    expect(result).toEqual(mockProject)
  })

  it("appends suffix to slug when slug already taken", async () => {
    const mockProjectWithIncludes = {
      ...mockProject,
      createdBy: { id: "user-1", name: "User One", email: "user@example.com" },
      _count: { members: 1, sprints: 0, cards: 0 },
    }
    vi.mocked(projectsRepo.findProjectBySlug)
      .mockResolvedValueOnce(mockProjectWithIncludes) // "meu-projeto" taken
      .mockResolvedValue(null)            // "meu-projeto-2" available
    vi.mocked(projectsRepo.createProject).mockResolvedValue({
      ...mockProject,
      slug: "meu-projeto-2",
    })
    vi.mocked(membersRepo.createMember).mockResolvedValue({
      id: "mem-2",
      projectId: "proj-1",
      userId: "user-1",
      role: "ADMIN",
      joinedAt: new Date(),
      removedAt: null,
    })

    const result = await createProject({ name: "Meu Projeto", createdById: "user-1" })

    expect(projectsRepo.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "meu-projeto-2" })
    )
    expect(result.slug).toBe("meu-projeto-2")
  })
})

describe("updateProject", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates project name and description", async () => {
    vi.mocked(projectsRepo.updateProject).mockResolvedValue({
      ...mockProject,
      name: "Novo Nome",
    })

    await updateProject("proj-1", { name: "Novo Nome" })

    expect(projectsRepo.updateProject).toHaveBeenCalledWith("proj-1", { name: "Novo Nome" })
  })
})

describe("archiveProject", () => {
  beforeEach(() => vi.clearAllMocks())

  it("archives project without deleting it", async () => {
    vi.mocked(projectsRepo.archiveProject).mockResolvedValue({
      ...mockProject,
      archivedAt: new Date(),
    })

    const result = await archiveProject("proj-1")

    expect(projectsRepo.archiveProject).toHaveBeenCalledWith("proj-1")
    expect(result.archivedAt).not.toBeNull()
    // Make sure it's not a hard delete
    expect(result.id).toBe("proj-1")
  })
})

describe("getProjectsForUser", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns projects for a user", async () => {
    vi.mocked(projectsRepo.findProjectsByMemberId).mockResolvedValue([mockProject as any])

    const result = await getProjectsForUser("user-1")

    expect(projectsRepo.findProjectsByMemberId).toHaveBeenCalledWith("user-1")
    expect(result).toHaveLength(1)
  })
})

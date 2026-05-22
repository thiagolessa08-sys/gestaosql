import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createInvitation,
  acceptInvitation,
} from "@/server/services/invitations"
import * as invitationRepo from "@/server/repositories/invitations"
import * as usersRepo from "@/server/repositories/users"
import * as membersRepo from "@/server/repositories/members"
import * as emailSend from "@/server/email/send"

vi.mock("@/server/db", () => ({ db: {} }))
vi.mock("@/server/email/client", () => ({ resend: {} }))
vi.mock("@/server/repositories/invitations")
vi.mock("@/server/repositories/users")
vi.mock("@/server/repositories/members")
vi.mock("@/server/email/send")

const mockInvitation = {
  id: "inv-1",
  projectId: "proj-1",
  email: "user@example.com",
  role: "MEMBER" as const,
  invitedById: "admin-1",
  token: "abc123",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
  acceptedAt: null,
  createdAt: new Date(),
  project: { id: "proj-1", name: "Projeto Test", slug: "projeto-test" },
}

describe("createInvitation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates invitation and sends email", async () => {
    vi.mocked(invitationRepo.createInvitation).mockResolvedValue(mockInvitation)
    vi.mocked(emailSend.sendEmail).mockResolvedValue(undefined)

    await createInvitation({
      projectId: "proj-1",
      projectName: "Projeto Test",
      email: "user@example.com",
      role: "MEMBER",
      invitedById: "admin-1",
      invitedByName: "Admin User",
    })

    expect(invitationRepo.createInvitation).toHaveBeenCalledOnce()
    expect(emailSend.sendEmail).toHaveBeenCalledOnce()
  })

  it("generates a unique token for each invitation", async () => {
    vi.mocked(invitationRepo.createInvitation).mockResolvedValue(mockInvitation)
    vi.mocked(emailSend.sendEmail).mockResolvedValue(undefined)

    await createInvitation({
      projectId: "proj-1",
      projectName: "Projeto Test",
      email: "a@example.com",
      role: "MEMBER",
      invitedById: "admin-1",
      invitedByName: "Admin",
    })
    await createInvitation({
      projectId: "proj-1",
      projectName: "Projeto Test",
      email: "b@example.com",
      role: "MEMBER",
      invitedById: "admin-1",
      invitedByName: "Admin",
    })

    const firstCall = vi.mocked(invitationRepo.createInvitation).mock.calls[0][0]
    const secondCall = vi.mocked(invitationRepo.createInvitation).mock.calls[1][0]
    expect(firstCall.token).not.toBe(secondCall.token)
  })
})

describe("acceptInvitation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws if token not found", async () => {
    vi.mocked(invitationRepo.findInvitationByToken).mockResolvedValue(null)

    await expect(
      acceptInvitation({ token: "bad-token", name: "User", password: "pass123" })
    ).rejects.toThrow("Convite inválido")
  })

  it("throws if invitation already accepted", async () => {
    vi.mocked(invitationRepo.findInvitationByToken).mockResolvedValue({
      ...mockInvitation,
      acceptedAt: new Date(),
    })

    await expect(
      acceptInvitation({ token: "abc123", name: "User", password: "pass123" })
    ).rejects.toThrow("Convite já utilizado")
  })

  it("throws if invitation expired", async () => {
    vi.mocked(invitationRepo.findInvitationByToken).mockResolvedValue({
      ...mockInvitation,
      expiresAt: new Date(Date.now() - 1000), // expired
    })

    await expect(
      acceptInvitation({ token: "abc123", name: "User", password: "pass123" })
    ).rejects.toThrow("Convite expirado")
  })

  it("creates new user and member when user does not exist", async () => {
    vi.mocked(invitationRepo.findInvitationByToken).mockResolvedValue(mockInvitation)
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue(null)
    vi.mocked(usersRepo.createUser).mockResolvedValue({
      id: "new-user",
      name: "User",
      email: "user@example.com",
      isSystemAdmin: false,
      mustChangePassword: false,
    })
    vi.mocked(membersRepo.createMember).mockResolvedValue({
      id: "mem-1",
      projectId: "proj-1",
      userId: "new-user",
      role: "MEMBER",
      joinedAt: new Date(),
      removedAt: null,
    })
    vi.mocked(invitationRepo.markInvitationAccepted).mockResolvedValue(mockInvitation)

    await acceptInvitation({ token: "abc123", name: "User", password: "pass12345" })

    expect(usersRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com", name: "User" })
    )
    expect(membersRepo.createMember).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-1", role: "MEMBER" })
    )
    expect(invitationRepo.markInvitationAccepted).toHaveBeenCalledWith("abc123")
  })

  it("adds existing user as member when user already exists", async () => {
    vi.mocked(invitationRepo.findInvitationByToken).mockResolvedValue(mockInvitation)
    vi.mocked(usersRepo.findUserByEmail).mockResolvedValue({
      id: "existing-user",
      name: "Existing User",
      email: "user@example.com",
      passwordHash: "hash",
      avatarUrl: null,
      isSystemAdmin: false,
      mustChangePassword: false,
    })
    vi.mocked(membersRepo.findMemberByUserAndProject).mockResolvedValue(null)
    vi.mocked(membersRepo.createMember).mockResolvedValue({
      id: "mem-1",
      projectId: "proj-1",
      userId: "existing-user",
      role: "MEMBER",
      joinedAt: new Date(),
      removedAt: null,
    })
    vi.mocked(invitationRepo.markInvitationAccepted).mockResolvedValue(mockInvitation)

    await acceptInvitation({ token: "abc123", name: "Existing User", password: "pass12345" })

    expect(usersRepo.createUser).not.toHaveBeenCalled()
    expect(membersRepo.createMember).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "existing-user", projectId: "proj-1" })
    )
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/server/repositories/users", () => ({
  findUserById: vi.fn(),
  findUserByIdWithPassword: vi.fn(),
  updateUser: vi.fn(),
  updateUserPassword: vi.fn(),
}))
vi.mock("@/server/db", () => ({ db: {} }))

import { updateProfile, changePassword } from "@/server/services/users"
import {
  findUserByIdWithPassword,
  updateUser,
  updateUserPassword,
} from "@/server/repositories/users"

const mockUser = {
  id: "user-1",
  name: "Ana",
  email: "ana@test.com",
  passwordHash: "$2b$12$existingHash",
  avatarUrl: null,
  mustChangePassword: false,
}

describe("updateProfile", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates name and avatarUrl", async () => {
    vi.mocked(findUserByIdWithPassword).mockResolvedValue(mockUser as any)
    vi.mocked(updateUser).mockResolvedValue({ ...mockUser, name: "Bob" } as any)
    await updateProfile({ userId: "user-1", name: "Bob", avatarUrl: null })
    expect(updateUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ name: "Bob" })
    )
  })

  it("throws if user not found", async () => {
    vi.mocked(findUserByIdWithPassword).mockResolvedValue(null)
    await expect(
      updateProfile({ userId: "bad", name: "X", avatarUrl: null })
    ).rejects.toThrow()
  })

  it("does not update email or password", async () => {
    vi.mocked(findUserByIdWithPassword).mockResolvedValue(mockUser as any)
    vi.mocked(updateUser).mockResolvedValue(mockUser as any)
    await updateProfile({ userId: "user-1", name: "Ana", avatarUrl: null })
    const call = vi.mocked(updateUser).mock.calls[0][1]
    expect(call).not.toHaveProperty("email")
    expect(call).not.toHaveProperty("passwordHash")
  })
})

describe("changePassword", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws if current password is wrong", async () => {
    // bcryptjs.compare will return false for mismatched hash
    vi.mocked(findUserByIdWithPassword).mockResolvedValue(mockUser as any)
    await expect(
      changePassword({
        userId: "user-1",
        currentPassword: "wrong",
        newPassword: "newPass123",
      })
    ).rejects.toThrow("Senha atual incorreta")
  })

  it("updates password hash when current password is correct", async () => {
    // Use a real bcrypt hash for "currentPass"
    const bcrypt = await import("bcryptjs")
    const hash = await bcrypt.hash("currentPass", 12)
    vi.mocked(findUserByIdWithPassword).mockResolvedValue({
      ...mockUser,
      passwordHash: hash,
    } as any)
    vi.mocked(updateUserPassword).mockResolvedValue({ ...mockUser } as any)
    await changePassword({
      userId: "user-1",
      currentPassword: "currentPass",
      newPassword: "newPass123",
    })
    expect(updateUserPassword).toHaveBeenCalledWith("user-1", expect.any(String))
  })
})

import { db } from "@/server/db"
import { hash } from "bcryptjs"

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      avatarUrl: true,
      isSystemAdmin: true,
      mustChangePassword: true,
    },
  })
}

export async function findAnyUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      deletedAt: true,
    },
  })
}

export async function reactivateUser(
  id: string,
  data: {
    name: string
    password: string
    isSystemAdmin: boolean
    perfil: import("@prisma/client").PerfilAcesso
    mustChangePassword: boolean
  }
) {
  const passwordHash = await hash(data.password, 12)
  return db.user.update({
    where: { id },
    data: {
      name: data.name,
      passwordHash,
      isSystemAdmin: data.isSystemAdmin,
      perfil: data.perfil,
      mustChangePassword: data.mustChangePassword,
      deletedAt: null,
    },
  })
}

export async function findUserById(id: string) {
  return db.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isSystemAdmin: true,
      mustChangePassword: true,
    },
  })
}

export async function findUserByIdWithPassword(id: string) {
  return db.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      passwordHash: true,
      isSystemAdmin: true,
      mustChangePassword: true,
    },
  })
}

export async function updateUser(
  id: string,
  data: { name?: string; avatarUrl?: string | null }
) {
  return db.user.update({ where: { id }, data })
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  isSystemAdmin?: boolean
  perfil?: import("@prisma/client").PerfilAcesso
  mustChangePassword?: boolean
}) {
  const passwordHash = await hash(data.password, 12)
  return db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      isSystemAdmin: data.isSystemAdmin ?? false,
      perfil: data.perfil ?? "PROJETOS",
      mustChangePassword: data.mustChangePassword ?? false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isSystemAdmin: true,
      perfil: true,
      mustChangePassword: true,
    },
  })
}

export async function updateUserTipo(
  id: string,
  data: { isSystemAdmin: boolean; perfil: import("@prisma/client").PerfilAcesso }
) {
  return db.user.update({ where: { id }, data })
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = await hash(newPassword, 12)
  return db.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  })
}

export async function findAllUsers() {
  return db.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      isSystemAdmin: true,
      perfil: true,
      mustChangePassword: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function markUserDeleted(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  })
}

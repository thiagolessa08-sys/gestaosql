import {
  findProjectBySlug,
  findProjectsByMemberId,
  findAllProjects,
  createProject as createProjectRecord,
  updateProject as updateProjectRecord,
  archiveProject as archiveProjectRecord,
} from "@/server/repositories/projects"
import { createMember } from "@/server/repositories/members"
import { generateSlug } from "@/lib/utils"

interface CreateProjectInput {
  name: string
  description?: string
  createdById: string
}

async function findAvailableSlug(base: string): Promise<string> {
  const existing = await findProjectBySlug(base)
  if (!existing) return base

  let counter = 2
  while (true) {
    const candidate = `${base}-${counter}`
    const taken = await findProjectBySlug(candidate)
    if (!taken) return candidate
    counter++
  }
}

export async function createProject(input: CreateProjectInput) {
  const baseSlug = generateSlug(input.name)
  const slug = await findAvailableSlug(baseSlug)

  const project = await createProjectRecord({
    name: input.name,
    slug,
    description: input.description,
    createdById: input.createdById,
  })

  await createMember({
    projectId: project.id,
    userId: input.createdById,
    role: "ADMIN",
  })

  return project
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string | null }
) {
  return updateProjectRecord(id, data)
}

export async function archiveProject(id: string) {
  return archiveProjectRecord(id)
}

export async function getProjectsForUser(userId: string, isSystemAdmin = false) {
  // System admins see all projects; regular users see only their projects
  if (isSystemAdmin) return findAllProjects()
  return findProjectsByMemberId(userId)
}

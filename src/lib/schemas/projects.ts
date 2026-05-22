import { z } from "zod"

export const createProjectSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  description: z.string().max(500).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

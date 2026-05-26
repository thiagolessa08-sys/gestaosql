import { z } from "zod"

const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
const CardStatusEnum = z.enum(["BACKLOG", "DOING", "VALIDATION", "DONE"])

export const createCardSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(255),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().uuid().optional(),
  priority: PriorityEnum.default("MEDIUM"),
  storyPoints: z.coerce.number().int().min(0).max(100).optional(),
  dueDate: z.coerce.date().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const updateCardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: PriorityEnum.optional(),
  storyPoints: z.coerce.number().int().min(0).max(100).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  mainActivityId: z.string().uuid().optional().nullable(),
})

export const moveCardSchema = z.object({
  toStatus: CardStatusEnum,
  toPosition: z.number().int().min(0).optional(),
})

export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type MoveCardInput = z.infer<typeof moveCardSchema>

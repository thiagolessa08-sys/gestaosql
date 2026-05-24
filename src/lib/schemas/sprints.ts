import { z } from "zod"

export const createSprintSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    goal: z.string().max(500).optional(),
    plannedStartDate: z.coerce.date(),
    plannedEndDate: z.coerce.date(),
  })
  .refine(
    (data) => data.plannedEndDate >= data.plannedStartDate,
    {
      message:
        "A data de término deve ser igual ou posterior à data de início",
      path: ["plannedEndDate"],
    }
  )

export const updateSprintSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  goal: z.string().max(500).optional().nullable(),
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
})

export const closeSprintSchema = z.object({
  destinationSprintId: z.string().uuid().optional(),
})

export type CreateSprintInput = z.infer<typeof createSprintSchema>
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>
export type CloseSprintInput = z.infer<typeof closeSprintSchema>

import { z } from "zod"

/**
 * Parseia datas de inputs HTML (<input type="date"> → "YYYY-MM-DD") como
 * data LOCAL ao invés de UTC. `new Date("2026-01-15")` é interpretado como
 * meia-noite UTC, que em fusos negativos (Brasil, UTC-3) "volta" um dia ao
 * exibir. Aqui montamos a data no fuso local para preservar o dia escolhido.
 */
const localDate = z.coerce
  .string()
  .transform((value, ctx) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
    if (match) {
      const [, y, m, d] = match
      return new Date(Number(y), Number(m) - 1, Number(d))
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida" })
      return z.NEVER
    }
    return parsed
  })

export const createSprintSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
    goal: z.string().max(500).optional(),
    plannedStartDate: localDate,
    plannedEndDate: localDate,
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
  plannedStartDate: localDate.optional(),
  plannedEndDate: localDate.optional(),
})

export const closeSprintSchema = z.object({
  destinationSprintId: z.string().uuid().optional(),
})

export type CreateSprintInput = z.infer<typeof createSprintSchema>
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>
export type CloseSprintInput = z.infer<typeof closeSprintSchema>

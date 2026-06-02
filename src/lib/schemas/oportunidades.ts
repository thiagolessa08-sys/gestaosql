import { z } from "zod"
import { EtapaComercial, AtividadeComercial } from "@prisma/client"

export const oportunidadeSchema = z.object({
  cliente: z.string().min(1, "Cliente é obrigatório").max(255),
  produto: z.string().max(255).optional(),
  origemLead: z.string().max(255).optional(),
  descricao: z.string().max(5000).optional(),
  etapa: z.nativeEnum(EtapaComercial),
  atividade: z.nativeEnum(AtividadeComercial).optional().nullable(),
  valor: z.coerce.number().positive("Valor deve ser positivo").optional().nullable(),
  prazoFechamento: z.coerce.date().optional().nullable(),
  responsavelId: z.string().optional().nullable(),
})

export type OportunidadeInput = z.infer<typeof oportunidadeSchema>

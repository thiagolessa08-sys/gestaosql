import { EtapaComercial } from "@prisma/client"

export interface EtapaConfig {
  enum: EtapaComercial
  label: string
}

export const COLUNAS_COMERCIAL: EtapaConfig[] = [
  { enum: EtapaComercial.SUSPECT,    label: "Suspect" },
  { enum: EtapaComercial.LEAD,       label: "Lead" },
  { enum: EtapaComercial.PROSPECT_C, label: "Prospect C" },
  { enum: EtapaComercial.PROSPECT_B, label: "Prospect B" },
  { enum: EtapaComercial.PROSPECT_A, label: "Prospect A" },
  { enum: EtapaComercial.CONCLUIDO,  label: "Concluído" },
  { enum: EtapaComercial.PERDIDO,    label: "Perdido" },
]

export function getEtapaConfig(etapa: EtapaComercial): EtapaConfig {
  const config = COLUNAS_COMERCIAL.find((c) => c.enum === etapa)
  if (!config) throw new Error(`Etapa desconhecida: ${etapa}`)
  return config
}

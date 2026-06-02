import { EtapaComercial, AtividadeComercial } from "@prisma/client"

export interface EtapaConfig {
  enum: EtapaComercial
  label: string
}

export interface AtividadeConfig {
  enum: AtividadeComercial
  label: string
  pct: number
  etapa: EtapaComercial
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

export const ATIVIDADES_COMERCIAL: AtividadeConfig[] = [
  { enum: AtividadeComercial.MAPEAMENTO,            label: "Mapeamento",              pct: 0,   etapa: EtapaComercial.SUSPECT },
  { enum: AtividadeComercial.APRESENTACAO,          label: "Apresentação",            pct: 0,   etapa: EtapaComercial.SUSPECT },
  { enum: AtividadeComercial.DESPERTOU_INTERESSE,   label: "Despertou Interesse",     pct: 1,   etapa: EtapaComercial.LEAD },
  { enum: AtividadeComercial.ABORDAGEM,             label: "Abordagem",               pct: 2,   etapa: EtapaComercial.PROSPECT_C },
  { enum: AtividadeComercial.DOR_ADMITIDA,          label: "Dor Admitida",            pct: 5,   etapa: EtapaComercial.PROSPECT_C },
  { enum: AtividadeComercial.BUDGET_IDENTIFICADO,   label: "Budget Identificado",     pct: 5,   etapa: EtapaComercial.PROSPECT_C },
  { enum: AtividadeComercial.DIAGRAMA_PODER,        label: "Diagrama de Poder",       pct: 5,   etapa: EtapaComercial.PROSPECT_C },
  { enum: AtividadeComercial.LEVANTAMENTO_AMBIENTE, label: "Levantamento do Ambiente",pct: 10,  etapa: EtapaComercial.PROSPECT_B },
  { enum: AtividadeComercial.TR_ETP,                label: "TR / ETP",                pct: 15,  etapa: EtapaComercial.PROSPECT_B },
  { enum: AtividadeComercial.AVALIACAO_CONCORRENCIA,label: "Avaliação da Concorrência",pct: 16, etapa: EtapaComercial.PROSPECT_B },
  { enum: AtividadeComercial.PROPOSTA_EMITIDA,      label: "Proposta Emitida",        pct: 20,  etapa: EtapaComercial.PROSPECT_B },
  { enum: AtividadeComercial.SHORT_LIST,            label: "Short List",              pct: 33,  etapa: EtapaComercial.PROSPECT_B },
  { enum: AtividadeComercial.DECISAO_DEFINIDA,      label: "Decisão Definida",        pct: 50,  etapa: EtapaComercial.PROSPECT_B },
  { enum: AtividadeComercial.LICITACAO,             label: "Licitação",               pct: 70,  etapa: EtapaComercial.PROSPECT_A },
  { enum: AtividadeComercial.TERMOS_ACEITE,         label: "Termos de Aceite",        pct: 90,  etapa: EtapaComercial.PROSPECT_A },
  { enum: AtividadeComercial.NEGOCIACAO_CONTRATO,   label: "Negociação de Contrato",  pct: 98,  etapa: EtapaComercial.PROSPECT_A },
  { enum: AtividadeComercial.ASSINATURA_CONTRATO,   label: "Assinatura de Contrato",  pct: 100, etapa: EtapaComercial.PROSPECT_A },
]

export function getAtividadeConfig(a: AtividadeComercial): AtividadeConfig {
  const config = ATIVIDADES_COMERCIAL.find((x) => x.enum === a)
  if (!config) throw new Error(`Atividade desconhecida: ${a}`)
  return config
}

export function getEtapaDaAtividade(a: AtividadeComercial): EtapaComercial {
  return getAtividadeConfig(a).etapa
}

export function getAtividadesDaEtapa(e: EtapaComercial): AtividadeConfig[] {
  return ATIVIDADES_COMERCIAL.filter((x) => x.etapa === e)
}

export function getPrimeiraAtividade(e: EtapaComercial): AtividadeComercial | null {
  return getAtividadesDaEtapa(e)[0]?.enum ?? null
}

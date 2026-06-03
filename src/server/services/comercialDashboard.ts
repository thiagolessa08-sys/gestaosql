import { findOportunidadesParaDashboard } from "@/server/repositories/oportunidades"
import {
  COLUNAS_COMERCIAL,
  getEtapaConfig,
  getAtividadeConfig,
} from "@/lib/comercial"
import { EtapaComercial } from "@prisma/client"

const ENCERRADAS: EtapaComercial[] = [EtapaComercial.CONCLUIDO, EtapaComercial.PERDIDO]
const DIAS_ESTAGNADA = 14

type Op = Awaited<ReturnType<typeof findOportunidadesParaDashboard>>[number]

function valorDe(op: Op): number {
  return op.valor != null ? Number(op.valor) : 0
}

function pctDe(op: Op): number {
  if (!op.atividade) return op.etapa === EtapaComercial.CONCLUIDO ? 100 : 0
  return getAtividadeConfig(op.atividade).pct
}

function isAberta(op: Op): boolean {
  return !ENCERRADAS.includes(op.etapa)
}

export interface ComercialDashboardData {
  kpis: {
    abertasCount: number
    pipelineValor: number
    forecast: number
    ganhosMesCount: number
    ganhosMesValor: number
  }
  funil: { etapa: EtapaComercial; label: string; count: number; valor: number }[]
  ganhosPerdidos: {
    ganhosCount: number
    ganhosValor: number
    perdidosCount: number
    perdidosValor: number
    taxaConversao: number
  }
  ranking: {
    responsavel: string
    abertasCount: number
    valorAberto: number
    forecast: number
    ganhosValor: number
  }[]
  previsaoMeses: { label: string; valor: number }[]
  estagnadas: {
    id: string
    cliente: string
    etapaLabel: string
    atividadeLabel: string | null
    valor: number
    diasParado: number
    responsavel: string | null
  }[]
  top: { id: string; cliente: string; etapaLabel: string; valor: number; responsavel: string | null }[]
  porProduto: { label: string; valor: number }[]
  porOrigem: { label: string; valor: number }[]
}

function somaPorChave(
  ops: Op[],
  chave: (op: Op) => string
): { label: string; valor: number }[] {
  const mapa = new Map<string, number>()
  for (const op of ops) {
    const k = chave(op)
    mapa.set(k, (mapa.get(k) ?? 0) + valorDe(op))
  }
  return [...mapa.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor)
}

export async function getComercialDashboard(): Promise<ComercialDashboardData> {
  const ops = await findOportunidadesParaDashboard()
  const abertas = ops.filter(isAberta)

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

  // KPIs
  const pipelineValor = abertas.reduce((s, op) => s + valorDe(op), 0)
  const forecast = abertas.reduce((s, op) => s + valorDe(op) * (pctDe(op) / 100), 0)
  const ganhos = ops.filter((op) => op.etapa === EtapaComercial.CONCLUIDO)
  const perdidos = ops.filter((op) => op.etapa === EtapaComercial.PERDIDO)
  const ganhosMes = ganhos.filter((op) => op.updatedAt >= inicioMes)

  // Funil
  const funil = COLUNAS_COMERCIAL.map((c) => {
    const doEtapa = ops.filter((op) => op.etapa === c.enum)
    return {
      etapa: c.enum,
      label: c.label,
      count: doEtapa.length,
      valor: doEtapa.reduce((s, op) => s + valorDe(op), 0),
    }
  })

  // Ranking por responsável
  const grupos = new Map<string, Op[]>()
  for (const op of ops) {
    const nome = op.responsavel?.name ?? "Sem responsável"
    if (!grupos.has(nome)) grupos.set(nome, [])
    grupos.get(nome)!.push(op)
  }
  const ranking = [...grupos.entries()]
    .map(([responsavel, lista]) => {
      const ab = lista.filter(isAberta)
      return {
        responsavel,
        abertasCount: ab.length,
        valorAberto: ab.reduce((s, op) => s + valorDe(op), 0),
        forecast: ab.reduce((s, op) => s + valorDe(op) * (pctDe(op) / 100), 0),
        ganhosValor: lista
          .filter((op) => op.etapa === EtapaComercial.CONCLUIDO)
          .reduce((s, op) => s + valorDe(op), 0),
      }
    })
    .sort((a, b) => b.valorAberto - a.valorAberto)

  // Previsão por mês de fechamento (abertas)
  const mesMapa = new Map<string, number>() // key YYYY-MM ou "sem"
  for (const op of abertas) {
    const key = op.prazoFechamento
      ? `${op.prazoFechamento.getFullYear()}-${String(op.prazoFechamento.getMonth() + 1).padStart(2, "0")}`
      : "sem"
    mesMapa.set(key, (mesMapa.get(key) ?? 0) + valorDe(op))
  }
  const comPrazo = [...mesMapa.entries()]
    .filter(([k]) => k !== "sem")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, valor]) => {
      const [ano, mes] = k.split("-").map(Number)
      const d = new Date(ano, mes - 1, 1)
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      return { label, valor }
    })
  const previsaoMeses = mesMapa.has("sem")
    ? [...comPrazo, { label: "Sem prazo", valor: mesMapa.get("sem")! }]
    : comPrazo

  // Estagnadas
  const limite = new Date(agora.getTime() - DIAS_ESTAGNADA * 24 * 60 * 60 * 1000)
  const estagnadas = abertas
    .filter((op) => op.updatedAt < limite)
    .map((op) => ({
      id: op.id,
      cliente: op.cliente,
      etapaLabel: getEtapaConfig(op.etapa).label,
      atividadeLabel: op.atividade ? getAtividadeConfig(op.atividade).label : null,
      valor: valorDe(op),
      diasParado: Math.floor((agora.getTime() - op.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
      responsavel: op.responsavel?.name ?? null,
    }))
    .sort((a, b) => b.diasParado - a.diasParado)
    .slice(0, 15)

  // Top 5 abertas por valor
  const top = [...abertas]
    .sort((a, b) => valorDe(b) - valorDe(a))
    .slice(0, 5)
    .map((op) => ({
      id: op.id,
      cliente: op.cliente,
      etapaLabel: getEtapaConfig(op.etapa).label,
      valor: valorDe(op),
      responsavel: op.responsavel?.name ?? null,
    }))

  const porProduto = somaPorChave(abertas, (op) => op.produto || "Sem produto").slice(0, 5)
  const porOrigem = somaPorChave(abertas, (op) => op.origemLead || "Sem origem").slice(0, 5)

  return {
    kpis: {
      abertasCount: abertas.length,
      pipelineValor,
      forecast,
      ganhosMesCount: ganhosMes.length,
      ganhosMesValor: ganhosMes.reduce((s, op) => s + valorDe(op), 0),
    },
    funil,
    ganhosPerdidos: {
      ganhosCount: ganhos.length,
      ganhosValor: ganhos.reduce((s, op) => s + valorDe(op), 0),
      perdidosCount: perdidos.length,
      perdidosValor: perdidos.reduce((s, op) => s + valorDe(op), 0),
      taxaConversao:
        ganhos.length + perdidos.length > 0
          ? ganhos.length / (ganhos.length + perdidos.length)
          : 0,
    },
    ranking,
    previsaoMeses,
    estagnadas,
    top,
    porProduto,
    porOrigem,
  }
}
